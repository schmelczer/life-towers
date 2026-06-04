import { describe, it, expect } from 'vitest';
import { createSseParser, SseMessage } from './sse';

function collect(): { feed: (c: string) => void; messages: SseMessage[] } {
  const messages: SseMessage[] = [];
  return { feed: createSseParser((m) => messages.push(m)), messages };
}

describe('createSseParser', () => {
  it('parses a complete event/data frame', () => {
    const { feed, messages } = collect();
    feed('event: revision\ndata: {"revision": 3}\n\n');
    expect(messages).toEqual([{ event: 'revision', data: '{"revision": 3}' }]);
  });

  it('buffers across chunk boundaries that split a frame', () => {
    const { feed, messages } = collect();
    feed('event: revis');
    feed('ion\ndata: {"revisi');
    feed('on": 9}\n\n');
    expect(messages).toEqual([{ event: 'revision', data: '{"revision": 9}' }]);
  });

  it('emits one message per frame for back-to-back events', () => {
    const { feed, messages } = collect();
    feed('event: revision\ndata: {"revision": 1}\n\nevent: revision\ndata: {"revision": 2}\n\n');
    expect(messages.map((m) => m.data)).toEqual(['{"revision": 1}', '{"revision": 2}']);
  });

  it('ignores keepalive comment lines', () => {
    const { feed, messages } = collect();
    feed(': keepalive\n\n');
    feed('data: {"revision": 4}\n\n');
    expect(messages).toEqual([{ event: null, data: '{"revision": 4}' }]);
  });

  it('tolerates CRLF line endings', () => {
    const { feed, messages } = collect();
    feed('event: revision\r\ndata: {"revision": 5}\r\n\r\n');
    expect(messages).toEqual([{ event: 'revision', data: '{"revision": 5}' }]);
  });

  it('does not emit until a frame is terminated by a blank line', () => {
    const { feed, messages } = collect();
    feed('data: {"revision": 6}\n');
    expect(messages).toEqual([]);
    feed('\n');
    expect(messages).toEqual([{ event: null, data: '{"revision": 6}' }]);
  });
});
