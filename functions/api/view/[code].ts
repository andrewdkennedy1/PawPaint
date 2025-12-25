export const onRequest = async (context: any) => {
  const code = (context.params.code as string | undefined)?.toUpperCase();
  if (!code) {
    return new Response('Room code required', { status: 400 });
  }

  const cacheKey = new Request(`https://pawpaint/view/${code}`);
  const cache = caches.default;

  if (context.request.method === 'POST') {
    try {
      const body = await context.request.json();
      if (!body?.image || typeof body.image !== 'string') {
        return new Response('Image required', { status: 400 });
      }

      const payload = JSON.stringify({ image: body.image, updatedAt: Date.now() });
      await cache.put(
        cacheKey,
        new Response(payload, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
          },
        }),
      );
      return new Response(null, { status: 204 });
    } catch (err) {
      console.error('Failed to store snapshot', err);
      return new Response('Invalid payload', { status: 400 });
    }
  }

  const cached = await cache.match(cacheKey);
  if (!cached) {
    return new Response(JSON.stringify({ image: null, updatedAt: null }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' },
    });
  }

  const data = await cached.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' },
  });
};
