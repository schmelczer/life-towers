import { Component } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';

@Component({
  selector: 'app-edit-block',
  templateUrl: './edit-block.component.html',
  styleUrls: ['./edit-block.component.scss']
})
export class EditBlockComponent {
  selected: string;

  constructor(public modalService: ModalService) {}

  submit() {
    this.modalService.submit({
      selected: this.selected,
      description: this.modalService.active.input.description,
      isDone: this.modalService.active.input.isDone
    });
  }
}
