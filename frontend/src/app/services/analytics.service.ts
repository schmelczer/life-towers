import { Injectable, isDevMode } from '@angular/core';
import {
  init as plausibleInit,
  track as plausibleTrack,
  type PlausibleEventOptions,
} from '@plausible-analytics/tracker';

const ANALYTICS_AUTO_CAPTURE_PAGEVIEWS = true;
const ANALYTICS_DOMAIN = 'schmelczer.dev/towers';
const ANALYTICS_ENDPOINT = 'https://stats.schmelczer.dev/status';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private isInitialized = false;
  private hasTrackedStart = false;

  init(): void {
    if (this.isInitialized) return;
    try {
      plausibleInit({
        domain: ANALYTICS_DOMAIN,
        endpoint: ANALYTICS_ENDPOINT,
        autoCapturePageviews: ANALYTICS_AUTO_CAPTURE_PAGEVIEWS,
        logging: isDevMode(),
      });
      this.isInitialized = true;
    } catch (error) {
      console.warn('Could not initialize analytics.', error);
    }
  }

  private track(eventName: string, options: PlausibleEventOptions = {}): void {
    try {
      plausibleTrack(eventName, options);
    } catch (error) {
      console.warn(`Could not track analytics event "${eventName}".`, error);
    }
  }

  trackStart(): void {
    if (this.hasTrackedStart) return;
    this.hasTrackedStart = true;
    this.track('Start');
  }

  trackExampleLoaded(): void {
    this.track('Example Loaded');
  }

  trackPageCreated(): void {
    this.track('Page Created');
  }

  trackTowerCreated(): void {
    this.track('Tower Created');
  }

  trackBlockCreated({ isDone }: { isDone: boolean }): void {
    this.track('Block Created', { props: { isDone: String(isDone) } });
  }

  trackBlockCompleted(): void {
    this.track('Block Completed');
  }
}
