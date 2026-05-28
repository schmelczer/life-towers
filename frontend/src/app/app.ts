import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { StoreService } from './services/store.service';
import { PagesComponent } from './components/pages/pages.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PagesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<lt-pages />`,
})
export class App implements OnInit {
  private readonly store = inject(StoreService);

  ngOnInit(): void {
    this.store.init();
  }
}
