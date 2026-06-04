/**
 * Minimal incremental parser for the Server-Sent Events wire format.
 *
 * We consume the event stream with fetch()+ReadableStream rather than the
 * EventSource API (which can't send an Authorization header), so we parse the
 * frames ourselves. Returns a function you feed decoded text chunks; it buffers
 * across chunk boundaries and invokes `onMessage` once per complete event
 * (events are terminated by a blank line). Comment lines (": ...", used for
 * keepalives) are ignored.
 */
export interface SseMessage {
  event: string | null;
  data: string;
}

export function createSseParser(
  onMessage: (message: SseMessage) => void,
): (chunk: string) => void {
  let buffer = '';
  let dataLines: string[] = [];
  let eventName: string | null = null;

  const dispatch = (): void => {
    if (dataLines.length === 0 && eventName === null) return; // stray blank line
    onMessage({ event: eventName, data: dataLines.join('\n') });
    dataLines = [];
    eventName = null;
  };

  return (chunk: string): void => {
    buffer += chunk;
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1); // tolerate CRLF

      if (line === '') {
        dispatch();
        continue;
      }
      if (line.startsWith(':')) continue; // comment / keepalive

      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1); // SSE strips one leading space

      if (field === 'event') eventName = value;
      else if (field === 'data') dataLines.push(value);
      // 'id' / 'retry' are unused by this app.
    }
  };
}
