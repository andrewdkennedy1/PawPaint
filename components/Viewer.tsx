import React, { useEffect, useMemo, useState } from 'react';
import { PawPrint, Wifi } from 'lucide-react';

interface SnapshotResponse {
  image: string | null;
  updatedAt: number | null;
}

const Viewer: React.FC = () => {
  const presetRoomFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || '').toUpperCase();
  }, []);

  const [roomCodeInput, setRoomCodeInput] = useState<string>(presetRoomFromUrl);
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [snapshot, setSnapshot] = useState<SnapshotResponse>({ image: null, updatedAt: null });
  const [status, setStatus] = useState<string>('Enter the room code shown on the main PawPaint screen.');

  useEffect(() => {
    if (!activeRoom) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/view/${activeRoom}`);
        if (!res.ok) throw new Error('Failed to load snapshot');
        const json = (await res.json()) as SnapshotResponse;
        if (!cancelled) {
          setSnapshot(json);
          setStatus(json.image ? 'Live view' : 'Waiting for the first brush stroke...');
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setStatus('Connection lost. Retrying...');
        }
      }
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeRoom]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    setActiveRoom(roomCodeInput.trim().toUpperCase());
  };

  const formattedUpdatedAt = useMemo(() => {
    if (!snapshot.updatedAt) return null;
    return new Date(snapshot.updatedAt).toLocaleTimeString();
  }, [snapshot.updatedAt]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-white flex flex-col items-center p-6 text-pink-600">
      <div className="flex items-center gap-3 mt-6 mb-6">
        <PawPrint size={32} />
        <div>
          <p className="text-xs uppercase font-black tracking-[0.2em] text-pink-300">PawPaint</p>
          <h1 className="text-2xl font-black">Live Viewer</h1>
        </div>
      </div>

      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-pink-100 p-6 mb-6">
        <label className="block text-xs uppercase font-black tracking-[0.2em] text-pink-300 mb-3">
          Room code
        </label>
        <div className="flex gap-3">
          <input
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="flex-1 rounded-2xl border border-pink-200 px-4 py-3 text-lg font-black tracking-[0.15em] text-center focus:outline-none focus:ring-2 focus:ring-pink-300"
            maxLength={8}
            required
          />
          <button
            type="submit"
            className="px-4 py-3 bg-pink-500 text-white rounded-2xl font-black shadow-md flex items-center gap-2 hover:bg-pink-600"
          >
            <Wifi size={18} />
            Join
          </button>
        </div>
        <p className="text-pink-400 text-sm mt-3">{status}</p>
      </form>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-pink-100 overflow-hidden">
        {snapshot.image ? (
          <img src={snapshot.image} alt="Live PawPaint canvas" className="w-full h-auto" />
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center text-pink-300 text-sm font-black uppercase tracking-[0.2em] bg-pink-50">
            No paint yet. Waiting for the artist...
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 text-xs text-pink-400 bg-pink-50 border-t border-pink-100">
          <span>Room: {activeRoom || '—'}</span>
          <span>{formattedUpdatedAt ? `Updated ${formattedUpdatedAt}` : 'No updates yet'}</span>
        </div>
      </div>
    </div>
  );
};

export default Viewer;
