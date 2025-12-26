import { loadSnapshot, normalizeRoomCode, type SnapshotResponse } from '../storage';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store',
};

const eventStreamHeaders = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-store',
};

const FAST_POLL_INTERVAL_MS = 250;
const SLOW_POLL_INTERVAL_MS = 1000;
const RECENT_ACTIVITY_WINDOW_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatSseEvent = (event: string, data: SnapshotResponse) => {
  const id = typeof data.updatedAt === 'number' ? `id: ${data.updatedAt}\n` : '';
  return `${id}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

export const onRequest = async (context: any) => {
  const code = normalizeRoomCode(context.params.code as string | undefined);
  if (!code) return new Response('Room code required', { status: 400 });
  if (context.request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const url = new URL(context.request.url);
  const forceFast = url.searchParams.get('fast') === '1' || url.searchParams.get('mode') === 'live';

  if (typeof ReadableStream === 'undefined') {
    const snapshot = await loadSnapshot(context, code);
    return new Response(JSON.stringify(snapshot), { headers: jsonHeaders });
  }

  const encoder = new TextEncoder();
  const requestSignal: AbortSignal | undefined = context.request?.signal;

  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastUpdatedAt: number | null = null;
      let lastPingAt = 0;
      const startedAt = Date.now();

      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      const send = (text: string) => controller.enqueue(encoder.encode(text));

      const run = async () => {
        send('retry: 2000\n\n');

        const initial = await loadSnapshot(context, code);
        lastUpdatedAt = initial.updatedAt;
        send(formatSseEvent('snapshot', initial));

        while (!closed && Date.now() - startedAt < 1000 * 60 * 10) {
          const now = Date.now();
          const activeRecently = typeof lastUpdatedAt === 'number' && now - lastUpdatedAt < RECENT_ACTIVITY_WINDOW_MS;
          const pollInterval = forceFast || activeRecently ? FAST_POLL_INTERVAL_MS : SLOW_POLL_INTERVAL_MS;

          await sleep(pollInterval);
          if (closed) break;

          const snapshot = await loadSnapshot(context, code);
          if (snapshot.updatedAt !== lastUpdatedAt) {
            lastUpdatedAt = snapshot.updatedAt;
            send(formatSseEvent('snapshot', snapshot));
          }

          const pingNow = Date.now();
          if (pingNow - lastPingAt > 15000) {
            lastPingAt = pingNow;
            send(`: ping ${pingNow}\n\n`);
          }
        }

        close();
      };

      run().catch((err) => {
        console.error('Stream error', err);
        close();
      });

      requestSignal?.addEventListener('abort', close, { once: true });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, { headers: eventStreamHeaders });
};
