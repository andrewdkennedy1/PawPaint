import { loadSnapshot, normalizeRoomCode, saveSnapshot, touchSnapshot } from './storage';

const MAX_IMAGE_CHARS = 2_500_000;

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store',
};

export const onRequest = async (context: any) => {
  const code = normalizeRoomCode(context.params.code as string | undefined);
  if (!code) return new Response('Room code required', { status: 400 });

  const url = new URL(context.request.url);

  if (context.request.method === 'POST') {
    try {
      const body = await context.request.json();
      const image = body?.image;
      const ping = body?.ping === true;

      if (typeof image === 'string') {
        if (!image.startsWith('data:image/')) return new Response('Unsupported image type', { status: 415 });
        if (image.length > MAX_IMAGE_CHARS) return new Response('Image too large', { status: 413 });

        const now = Date.now();
        await saveSnapshot(context, code, image, now);
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-cache, no-store' } });
      }

      if (ping) {
        const now = Date.now();
        await touchSnapshot(context, code, now);
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-cache, no-store' } });
      }

      return new Response('Image or ping required', { status: 400 });
    } catch (err) {
      console.error('Failed to store snapshot', err);
      return new Response('Invalid payload', { status: 400 });
    }
  }

  if (context.request.method === 'GET') {
    if (url.searchParams.get('ping') === '1') {
      try {
        const now = Date.now();
        await touchSnapshot(context, code, now);
        return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-cache, no-store' } });
      } catch (err) {
        console.error('Failed to ping snapshot', err);
        return new Response('Failed to ping', { status: 500 });
      }
    }

    const snapshot = await loadSnapshot(context, code);
    return new Response(JSON.stringify(snapshot), { headers: jsonHeaders });
  }

  return new Response('Method not allowed', { status: 405 });
};
