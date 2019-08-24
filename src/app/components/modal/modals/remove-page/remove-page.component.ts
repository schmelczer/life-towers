import { Component } from '@angular/core';
import { ModalService } from '../../../../services/modal.service';

@Component({
  selector: 'app-remove-page',
  templateUrl: './remove-page.component.html',
  styleUrls: ['./remove-page.component.scss']
})
export class RemovePageComponent {
  constructor(public modalService: ModalService) {}
}
