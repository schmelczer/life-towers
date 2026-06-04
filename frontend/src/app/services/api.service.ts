import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataResponse, TreeDto } from '../models';
import { createSseParser } from '../utils/sse';

/** Callbacks for a live event stream. */
export interface EventStreamHandlers {
  /** A revision the server says is current; the store decides whether to refetch. */
  onRevision: (revision: number) => void;
  /** The stream ended on its own (server closed or network error) — not an
   *  intentional close. The caller may reconnect. */
  onClosed: () => void;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  health(): Promise<{ status: string }> {
    return firstValueFrom(this.http.get<{ status: string }>('api/v1/health'));
  }

  register(token: string): Promise<{ user_id: string }> {
    return firstValueFrom(
      this.http.post<{ user_id: string }>('api/v1/register', { token }),
    );
  }

  getData(token: string): Promise<DataResponse> {
    return firstValueFrom(
      this.http.get<DataResponse>('api/v1/data', { headers: this.authHeaders(token) }),
    );
  }

  /**
   * Replace the user's tree. `baseRevision` is the client's compare-and-swap
   * base, sent as If-Match; the server rejects with 409 if it has moved on.
   * Resolves to the new revision the write produced.
   */
  async putData(token: string, tree: TreeDto, baseRevision: number): Promise<number> {
    const headers = this.authHeaders(token).set('If-Match', String(baseRevision));
    const res = await firstValueFrom(
      this.http.put<{ revision: number }>('api/v1/data', tree, { headers }),
    );
    return res.revision;
  }

  /**
   * Open the SSE stream for a token via fetch()+ReadableStream so the Bearer
   * token travels in a header (EventSource can't do that). Returns a function
   * that closes the stream; closing it does NOT invoke `onClosed`.
   */
  openEventStream(token: string, handlers: EventStreamHandlers): () => void {
    const controller = new AbortController();
    void this.consumeEventStream(token, handlers, controller.signal);
    return () => controller.abort();
  }

  private async consumeEventStream(
    token: string,
    handlers: EventStreamHandlers,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const response = await fetch('api/v1/events', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal,
        cache: 'no-store',
      });
      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const feed = createSseParser((message) => {
        if (message.event !== null && message.event !== 'revision') return;
        try {
          const parsed = JSON.parse(message.data) as { revision?: unknown };
          if (typeof parsed.revision === 'number') handlers.onRevision(parsed.revision);
        } catch {
          /* ignore malformed frames */
        }
      });

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        feed(decoder.decode(value, { stream: true }));
      }
    } catch {
      /* aborted or network error — handled below */
    } finally {
      // An intentional close (controller.abort()) should not trigger a
      // reconnect; only an unexpected end does.
      if (!signal.aborted) handlers.onClosed();
    }
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
