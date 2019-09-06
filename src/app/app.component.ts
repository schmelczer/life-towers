import { Component } from '@angular/core';
import { InnerNode, InnerNodeState } from './store/inner-node';
import { Root } from './store/root';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'life';

  /* tests
  constructor() {

    const root = new Root<InnerNode>();
    root.log();

    const l = new InnerNode();
    const r = new InnerNode();
    root.addChildren([l, r]);
    root.log();

    const rl = new InnerNode();
    const rr = new InnerNode();
    r.addChildren([rl, rr]);
    root.log();

    rr.changeKeys<InnerNodeState>({ dummy: 8 });
    root.log();
  }
  */
}
