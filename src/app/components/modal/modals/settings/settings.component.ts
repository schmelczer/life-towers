import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';
import { DataService } from '../../../../services/data.service';
import { Page } from '../../../../model/page';
import { Data } from '../../../../model/data';
import { Subscription } from 'rxjs/internal/Subscription';
import { MapStoreService } from '../../../../services/map-store.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  data: Data;
  page: Page;

  private dataSubscription: Subscription;
  private pageSubscription: Subscription;

  token: string;

  constructor(public modalService: ModalService, private store: MapStoreService) {
    this.token = store.userToken;
  }

  ngOnInit() {
    const { data$, page$ } = this.modalService.active.input;

    this.dataSubscription = data$.subscribe(d => (this.data = d));
    this.pageSubscription = page$.subscribe(p => (this.page = p));
  }

  async deletePage() {
    try {
      await this.modalService.showRemovePage(this.page.name);
      this.data.removePage(this.page);
      this.modalService.submit();
    } catch {
      // pass
    }
  }

  setNewToken() {
    this.store.userToken = this.token;
  }

  ngOnDestroy() {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.pageSubscription) {
      this.pageSubscription.unsubscribe();
    }
  }
}
