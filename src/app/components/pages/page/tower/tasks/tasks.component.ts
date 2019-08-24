import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Block } from '../../../../../model/block';
import { Tower } from '../../../../../model/tower';
import { ModalService } from '../../../../../services/modal.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  @Input() tasks: Block[];
  @Input() tower: Tower;

  @Input() isOpen = false;

  @ViewChild('allTask') allTask: ElementRef;

  constructor(private modalService: ModalService) {}

  ngOnInit() {}

  async handleClick(block: Block) {
    try {
      const { selected, description, isDone } = await this.modalService.showEditBlock({
        options: this.tower.tags,
        default: block.tag,
        description: block.description,
        isDone: block.isDone
      });
      block.tag = selected;
      block.description = description;
      if (!block.isDone && isDone) {
        block.created = new Date();
      }
      block.isDone = isDone;
    } catch {
      // pass
    }
  }
}
