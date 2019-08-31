import { Component } from '@angular/core';
import { Cloneable } from './storage/cloneable';
import { Root } from './storage/root';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';

  constructor() {
    const root = new Root<Cloneable>();

    const l1 = new Cloneable(root, 'l1');
    const r1 = new Cloneable(root, 'r1');
    const r1r1 = new Cloneable(r1, 'r1r1');
    const r1l1 = new Cloneable(r1, 'r1l1');

    r1r1.changeName('r1r1 new');

    r1l1.changeName('r1l1 new');

    r1l1.map((c: Cloneable) => c.changeNameMap('bdeiwf'));
  }
}
