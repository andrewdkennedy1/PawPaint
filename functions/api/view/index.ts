const roomsKey = new Request('https://pawpaint/view/_rooms');

export const onRequest = async () => {
  const cache = caches.default;

  const cached = await cache.match(roomsKey);
  if (!cached) {
    return new Response(JSON.stringify({ rooms: [] }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' },
    });
  }

  try {
    const rooms = await cached.json();
    const now = Date.now();
    const activeRooms = (rooms || []).filter((room: any) => now - (room.updatedAt ?? 0) < 1000 * 60 * 60 * 3);

    return new Response(JSON.stringify({ rooms: activeRooms }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' },
    });
  } catch (err) {
    console.error('Failed to load rooms', err);
    return new Response(JSON.stringify({ rooms: [] }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' },
    });
  }
};
