import { Injectable } from '@angular/core';
import * as uuid from 'uuid';
import { Data } from '../model/data';
import { ITower } from '../interfaces/persistance/tower';
import { IPage } from '../interfaces/persistance/page';
import { IData } from '../interfaces/persistance/data';
import { IUnique } from '../interfaces/persistance/unique';
import { ApiService } from './api.service';
import { Unique } from '../store/unique';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';

const LOCAL_STORAGE_KEY = 'life-towers.data.v.3';

interface LifeTowersData {
  token: string;
  root: string;
  objects: {
    [id: string]: IUnique;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MapStoreService {
  private state: LifeTowersData;
  private canSaveTrigger: () => void;
  private canSave = new Promise(r => (this.canSaveTrigger = r));
  private dataToSave: Data;

  private saveEverything = false;

  private readonly _data: BehaviorSubject<Data> = new BehaviorSubject(null);
  readonly data: Observable<Data> = this._data.asObservable();

  constructor(private api: ApiService) {
    const storedData: string = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (storedData) {
      this.state = JSON.parse(storedData);
      this.initWithLoad().catch();
    } else {
      this.initWithRegister().catch();
    }
    this.api.track(this.state.token).catch();
  }

  private static getSeed(): LifeTowersData {
    const towerId = uuid.v4();
    const tower: ITower = {
      id: towerId,
      name: null,
      blocks: [],
      baseColor: { h: 0, s: 100, l: 50 }
    };

    const pageId = uuid.v4();
    const page: IPage = {
      id: pageId,
      name: 'My first page',
      towers: [towerId],
      userData: {
        hideCreateTowerButton: false,
        defaultDateRange: {
          from: null,
          to: null
        }
      }
    };

    const dataId = uuid.v4();
    const data: IData = {
      id: dataId,
      pages: [pageId]
    };

    return {
      token: uuid.v4(),
      root: dataId,
      objects: {
        [dataId]: data,
        [pageId]: page,
        [towerId]: tower
      }
    };
  }

  save(root: Data) {
    this.dataToSave = root;

    setTimeout(() => {
      if (this.dataToSave === root) {
        this.realSave(root).catch();
      }
    }, 750);
  }

  private get root(): Data {
    return new Data(this.state.objects[this.state.root] as IData, id => this.state.objects[id]);
  }

  get userToken(): string {
    return this.state.token;
  }

  set userToken(value: string) {
    this.state.token = value;
    this.initWithLoad().catch();
  }

  private async realSave(root: Data): Promise<void> {
    await this.canSave;

    const waiting: Array<Unique> = [root];
    const referenceSerializer = (e: Unique): string => {
      waiting.push(e);
      return e.id;
    };

    while (waiting.length > 0) {
      const candidate = waiting.pop();
      if (!this.saveEverything && this.state.objects.hasOwnProperty(candidate.id)) {
        continue;
      }

      const serialized = candidate.serialize(referenceSerializer);

      this.state.objects[candidate.id] = serialized;
      this.api.postObject(this.state.token, candidate.id, JSON.stringify(serialized)).catch();
    }

    this.api.setRootId(this.state.token, root.id).catch();
    this.state.root = root.id;

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
  }

  private async initWithRegister(id?: string) {
    this.state = MapStoreService.getSeed();
    if (id) {
      this.state.token = id;
    }
    this._data.next(this.root);

    await this.api.register(this.state.token).catch();
    this.canSaveTrigger();

    this.saveEverything = true;
    await this.realSave(this.root);
    this.saveEverything = false;
  }

  private async initWithLoad() {
    this.canSave = new Promise(r => (this.canSaveTrigger = r));

    let realRoot: string;
    try {
      realRoot = await this.api.getRootId(this.state.token).catch();
    } catch {
      this.initWithRegister(this.state.token).catch();
      return;
    }

    if (this.state.root !== realRoot) {
      this.state.root = realRoot;
      const root = await this.api.getObject(this.state.token, realRoot);
      this.state.objects[this.state.root] = root;

      const getUnknowns = async (element: any) => {
        const childrenAliases = ['pages', 'towers', 'blocks'];

        for (const childrenAlias of childrenAliases) {
          if (element.hasOwnProperty(childrenAlias)) {
            for (const p of element[childrenAlias]) {
              if (!this.state.objects.hasOwnProperty(p)) {
                const unknown = await this.api.getObject(this.state.token, p);
                this.state.objects[p] = unknown;
                await getUnknowns(unknown);
              }
            }
          }
        }
      };

      await getUnknowns(root);
    }
    this._data.next(this.root);
    this.canSaveTrigger();
  }
}
