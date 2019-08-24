import { Component } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';

@Component({
  selector: 'app-create-block',
  templateUrl: './create-block.component.html',
  styleUrls: ['./create-block.component.scss']
})
export class CreateBlockComponent {
  selected: string;
  description: string = null;
  isDone: boolean;

  constructor(public modalService: ModalService) {}

  submit() {
    this.modalService.submit({
      selected: this.selected,
      description: this.description,
      isDone: this.isDone
    });
  }
}
