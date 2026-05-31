import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { StoreService } from './services/store.service';
import { AnalyticsService } from './services/analytics.service';
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
  private readonly analytics = inject(AnalyticsService);

  ngOnInit(): void {
    this.analytics.init();
    void this.store.init();
  }
}
