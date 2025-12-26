export interface SnapshotResponse {
  image: string | null;
  updatedAt: number | null;
}

export interface ActiveRoom {
  code: string;
  image?: string | null;
  updatedAt: number | null;
}

type KVNamespaceLike = {
  get: (key: string, options?: { type?: 'json' }) => Promise<any>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  list: (options?: { prefix?: string; limit?: number; cursor?: string }) => Promise<{ keys: Array<{ name: string }> }>;
};

const ROOM_KEY_PREFIX = 'room:';
const ROOM_INDEX_KEY = 'rooms:index';

export const ROOM_TTL_SECONDS = 60 * 60 * 12;
export const ACTIVE_ROOM_WINDOW_MS = 1000 * 60 * 10;
export const ROOM_INDEX_WINDOW_MS = 1000 * 60 * 60 * 12;
export const MAX_ROOMS = 100;

export const normalizeRoomCode = (raw: string | undefined | null) => {
  const code = (raw ?? '').trim().toUpperCase();
  if (!code) return null;
  if (!/^[A-Z0-9]{3,8}$/.test(code)) return null;
  return code;
};

const getKV = (context: any): KVNamespaceLike | null => {
  const env = context?.env as any;
  const kv = (env?.PAWPAINT_VIEW as KVNamespaceLike | undefined) ?? null;
  if (!kv) return null;
  if (typeof kv.get !== 'function' || typeof kv.put !== 'function' || typeof kv.list !== 'function') return null;
  return kv;
};

const roomKey = (code: string) => `${ROOM_KEY_PREFIX}${code}`;

const storageHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': `public, max-age=${ROOM_TTL_SECONDS}`,
});

export const loadSnapshot = async (context: any, code: string): Promise<SnapshotResponse> => {
  const kv = getKV(context);
  if (kv) {
    const data = await kv.get(roomKey(code), { type: 'json' });
    const image = typeof data?.image === 'string' ? data.image : null;
    const updatedAt = typeof data?.updatedAt === 'number' ? data.updatedAt : null;
    return { image, updatedAt };
  }

  const cache = (caches as any).default as Cache;
  const cacheKey = new Request(`https://pawpaint/view/${code}`);
  const cached = await cache.match(cacheKey);
  if (!cached) return { image: null, updatedAt: null };
  try {
    const data = await cached.json();
    const image = typeof data?.image === 'string' ? data.image : null;
    const updatedAt = typeof data?.updatedAt === 'number' ? data.updatedAt : null;
    return { image, updatedAt };
  } catch {
    return { image: null, updatedAt: null };
  }
};

type RoomIndexEntry = {
  code: string;
  updatedAt: number | null;
};

const loadRoomIndexFromKV = async (kv: KVNamespaceLike): Promise<RoomIndexEntry[]> => {
  const data = await kv.get(ROOM_INDEX_KEY, { type: 'json' });
  if (!Array.isArray(data)) return [];
  return data
    .map((room: any) => ({
      code: typeof room?.code === 'string' ? room.code : '',
      updatedAt: typeof room?.updatedAt === 'number' ? room.updatedAt : null,
    }))
    .filter((room) => !!normalizeRoomCode(room.code));
};

const updateRoomIndexInKV = async (kv: KVNamespaceLike, code: string, updatedAt: number) => {
  const now = Date.now();
  const existingRooms = await loadRoomIndexFromKV(kv);
  const filteredRooms = existingRooms.filter((room) => now - (room.updatedAt ?? 0) < ROOM_INDEX_WINDOW_MS);
  const nextRooms: RoomIndexEntry[] = [{ code, updatedAt }, ...filteredRooms.filter((room) => room.code !== code)].slice(0, MAX_ROOMS);
  await kv.put(ROOM_INDEX_KEY, JSON.stringify(nextRooms), { expirationTtl: ROOM_TTL_SECONDS });
};

export const saveSnapshot = async (context: any, code: string, image: string | null, updatedAt: number) => {
  const payload = JSON.stringify({ image, updatedAt });
  const kv = getKV(context);
  if (kv) {
    await kv.put(roomKey(code), payload, { expirationTtl: ROOM_TTL_SECONDS });
    await updateRoomIndexInKV(kv, code, updatedAt);
    return;
  }

  const cache = (caches as any).default as Cache;
  const cacheKey = new Request(`https://pawpaint/view/${code}`);
  await cache.put(cacheKey, new Response(payload, { headers: storageHeaders() }));

  const roomsKey = new Request('https://pawpaint/view/_rooms');
  const existingRooms = await loadRoomIndexFromCache(cache, roomsKey);
  const now = Date.now();
  const filteredRooms = existingRooms.filter((room) => now - (room.updatedAt ?? 0) < ROOM_INDEX_WINDOW_MS);
  const nextRooms = [{ code, updatedAt, image }, ...filteredRooms.filter((room) => room.code !== code)].slice(0, MAX_ROOMS);
  await cache.put(roomsKey, new Response(JSON.stringify(nextRooms), { headers: storageHeaders() }));
};

export const touchSnapshot = async (context: any, code: string, updatedAt: number) => {
  const current = await loadSnapshot(context, code);
  const image = typeof current.image === 'string' ? current.image : null;
  await saveSnapshot(context, code, image, updatedAt);
};

const loadRoomIndexFromCache = async (cache: Cache, roomsKey: Request): Promise<ActiveRoom[]> => {
  const cachedRooms = await cache.match(roomsKey);
  if (!cachedRooms) return [];
  try {
    const rooms = await cachedRooms.json();
    if (!Array.isArray(rooms)) return [];
    return rooms
      .map((room: any) => ({
        code: typeof room?.code === 'string' ? room.code : '',
        updatedAt: typeof room?.updatedAt === 'number' ? room.updatedAt : null,
        image: typeof room?.image === 'string' ? room.image : null,
      }))
      .filter((room) => !!normalizeRoomCode(room.code));
  } catch {
    return [];
  }
};

export const listActiveRooms = async (context: any): Promise<ActiveRoom[]> => {
  const now = Date.now();
  const kv = getKV(context);
  if (kv) {
    try {
      const indexed = await loadRoomIndexFromKV(kv);
      if (indexed.length > 0) {
        const activeCodes = indexed
          .filter((room) => (room.updatedAt ? now - room.updatedAt < ACTIVE_ROOM_WINDOW_MS : false))
          .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
          .map((room) => room.code);

        const rooms = await Promise.all(
          activeCodes.map(async (code) => {
            const data = await kv.get(roomKey(code), { type: 'json' });
            const updatedAt = typeof data?.updatedAt === 'number' ? data.updatedAt : null;
            const image = typeof data?.image === 'string' ? data.image : null;
            return { code, updatedAt, image } as ActiveRoom;
          }),
        );

        return rooms
          .filter((room) => (room.updatedAt ? now - room.updatedAt < ACTIVE_ROOM_WINDOW_MS : false))
          .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      }
    } catch (err) {
      console.warn('Room index unavailable; falling back to KV scan', err);
    }

    const listed = await kv.list({ prefix: ROOM_KEY_PREFIX, limit: MAX_ROOMS });
    const rooms = await Promise.all(
      (listed.keys ?? []).map(async (key) => {
        const code = normalizeRoomCode(key.name.slice(ROOM_KEY_PREFIX.length));
        if (!code) return null;
        const data = await kv.get(key.name, { type: 'json' });
        const updatedAt = typeof data?.updatedAt === 'number' ? data.updatedAt : null;
        const image = typeof data?.image === 'string' ? data.image : null;
        return { code, updatedAt, image } as ActiveRoom;
      }),
    );

    return rooms
      .filter((room): room is ActiveRoom => !!room)
      .filter((room) => (room.updatedAt ? now - room.updatedAt < ACTIVE_ROOM_WINDOW_MS : false))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }

  const cache = (caches as any).default as Cache;
  const roomsKey = new Request('https://pawpaint/view/_rooms');
  const rooms = await loadRoomIndexFromCache(cache, roomsKey);
  return rooms.filter((room) => (room.updatedAt ? now - room.updatedAt < ACTIVE_ROOM_WINDOW_MS : false));
};
