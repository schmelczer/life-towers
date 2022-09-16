import { ChangeDetectionStrategy, Component, DoCheck } from '@angular/core';
import { CancelService } from './services/cancel.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements DoCheck {
  title = 'life';

  constructor(public cancelService: CancelService) {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.cancelService.cancelAll();
      }
    });
  }

  ngDoCheck() {
    // console.log('app change detection');
  }
}
