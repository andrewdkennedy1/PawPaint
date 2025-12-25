export const onRequest = async (context: any) => {
  const code = (context.params.code as string | undefined)?.toUpperCase();
  if (!code) {
    return new Response('Room code required', { status: 400 });
  }

  const cacheKey = new Request(`https://pawpaint/view/${code}`);
  const roomsKey = new Request('https://pawpaint/view/_rooms');
  const cache = caches.default;

  const loadRooms = async () => {
    const cachedRooms = await cache.match(roomsKey);
    if (!cachedRooms) return [] as any[];
    try {
      return (await cachedRooms.json()) as any[];
    } catch {
      return [] as any[];
    }
  };

  const saveRooms = async (rooms: any[]) => {
    await cache.put(
      roomsKey,
      new Response(JSON.stringify(rooms), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
        },
      }),
    );
  };

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

      const existingRooms = await loadRooms();
      const now = Date.now();
      const filteredRooms = existingRooms.filter((room) => now - (room.updatedAt ?? 0) < 1000 * 60 * 60 * 12);
      const nextRooms = [
        { code, updatedAt: now, image: body.image },
        ...filteredRooms.filter((room) => room.code !== code),
      ].slice(0, 100);
      await saveRooms(nextRooms);

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
