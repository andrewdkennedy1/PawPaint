import { listActiveRooms } from './storage';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store',
};

export const onRequest = async (context: any) => {
  try {
    const rooms = await listActiveRooms(context);
    return new Response(JSON.stringify({ rooms }), { headers: jsonHeaders });
  } catch (err) {
    console.error('Failed to load rooms', err);
    return new Response(JSON.stringify({ rooms: [] }), { headers: jsonHeaders });
  }
};
