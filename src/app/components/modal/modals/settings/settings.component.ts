import { Component } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';
import { DataService } from '../../../../services/data.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  constructor(public modalService: ModalService, public dataService: DataService) {}

  async deletePage() {
    try {
      await this.modalService.showRemovePage(this.dataService.active.name);
      this.dataService.remove();
      this.modalService.submit();
    } catch {
      // pass
    }
  }
}
