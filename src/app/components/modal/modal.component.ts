import { Component } from '@angular/core';
import { ModalService, ModalType } from '../../services/modal.service';
import { CancelService } from '../../services/cancel.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  ModalType = ModalType;

  constructor(public modalService: ModalService, private cancelService: CancelService) {
    this.cancelService.subscribe(this, () => this.modalService.cancel());
  }
}
