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

  constructor() {
    /*const rl = new InnerNode();
    const rr = new InnerNode();
    const l = new InnerNode();
    const r = new InnerNode([rl, rr]);
    const root = new Root<InnerNode>([l, r]);
    root.log();

    rr.changeKeys<InnerNodeState>({ dummy: 8 });
    root.log();*/
  }
}
