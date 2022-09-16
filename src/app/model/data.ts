import { InnerNode, InnerNodeState } from '../store/inner-node';
import { IData } from '../interfaces/persistance/data';
import { Page } from './page';

export interface DataState extends IData, InnerNodeState {}

export class Data extends InnerNode implements IData, DataState {
  constructor(props: IData, referenceDeserializer: (from: any) => any = e => e) {
    super(props.pages.map(p => new Page(referenceDeserializer(p), referenceDeserializer)), props.id);
  }

  get pages(): Array<Page> {
    return this.children as Array<Page>;
  }

  addPage(name: string) {
    const page = new Page({
      name,
      userData: {
        hideCreateTowerButton: false,
        defaultDateRange: {
          from: null,
          to: null
        }
      },
      towers: []
    });
    this.addChildren([page]);
    page.addTower();
  }

  removePage(page: Page) {
    this.changeKeys<any>({
      children: this.children.filter(c => c !== page)
    });
  }

  serialize(referenceSerializer: (ref: object) => any): IData {
    return {
      ...super.serialize(referenceSerializer),
      pages: this.pages.map(referenceSerializer)
    };
  }
}
