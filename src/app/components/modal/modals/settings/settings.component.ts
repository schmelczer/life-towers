import { Component } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';
import { DataService } from '../../../../services/data.service';
import { Page } from '../../../../model/page';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  constructor(public modalService: ModalService, public dataService: DataService) {
    this.modalService.active.input.subscribe(p => (this.page = p));
  }

  page: Page;

  async deletePage() {
    try {
      await this.modalService.showRemovePage(this.page.name);
      this.dataService.removePage(this.page);
      this.modalService.submit();
    } catch {
      // pass
    }
  }
}
