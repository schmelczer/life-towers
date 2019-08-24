import { Component } from '@angular/core';
import { ModalService, ModalType } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  // Needed for accessing the enum from html.
  ModalType = ModalType;

  constructor(public modalService: ModalService) {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.modalService.cancel();
      }
    });
  }
}
