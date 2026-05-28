import { Component } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';
import { Tower } from '../../../../model/tower';

@Component({
  selector: 'app-remove-tower',
  templateUrl: './remove-tower.component.html',
  styleUrls: ['./remove-tower.component.scss']
})
export class RemoveTowerComponent {
  constructor(public modalService: ModalService) {}

  tower: Tower = this.modalService.active.input;
}
