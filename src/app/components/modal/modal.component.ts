import { ChangeDetectorRef, Component } from '@angular/core';
import { ModalService, ModalType } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  ModalType = ModalType;

  constructor(public modalService: ModalService, private changeDetectionRef: ChangeDetectorRef) {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.modalService.cancel();
      }
    });

    /*window.addEventListener('resize', (_: UIEvent) => {
      console.log('resize');
      this.changeDetectionRef.markForCheck();
    });*/
  }
}
