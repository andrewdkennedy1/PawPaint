import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PawPrint, RefreshCcw, Wifi } from 'lucide-react';

interface SnapshotResponse {
  image: string | null;
  updatedAt: number | null;
}

interface ActiveRoom {
  code: string;
  image?: string | null;
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
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const refreshRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/view');
      if (!res.ok) throw new Error('Failed to load rooms');
      const json = await res.json();
      setRooms(json.rooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    refreshRooms();
    const id = setInterval(refreshRooms, 5000);
    return () => clearInterval(id);
  }, [refreshRooms]);

  useEffect(() => {
    if (presetRoomFromUrl) {
      setActiveRoom(presetRoomFromUrl);
      setRoomCodeInput(presetRoomFromUrl);
    }
  }, [presetRoomFromUrl]);

  useEffect(() => {
    if (!activeRoom) return undefined;

    setStatus('Connecting to room...');
    setSnapshot({ image: null, updatedAt: null });

    let cancelled = false;
    let pollId: number | null = null;
    let eventSource: EventSource | null = null;
    let fallbackTimer: number | null = null;
    let receivedFirstEvent = false;

    const applySnapshot = (json: SnapshotResponse) => {
      setSnapshot(json);
      if (json.image) {
        setStatus('Live view');
      } else if (json.updatedAt) {
        setStatus('Room active. Waiting for the first brush stroke...');
      } else {
        setStatus('Waiting for the artist to start...');
      }
    };

    const startPolling = () => {
      if (pollId) return;
      const poll = async () => {
        try {
          const res = await fetch(`/api/view/${activeRoom}`);
          if (!res.ok) throw new Error('Failed to load snapshot');
          const json = (await res.json()) as SnapshotResponse;
          if (!cancelled) applySnapshot(json);
        } catch (err) {
          if (!cancelled) {
            console.error(err);
            setStatus('Connection lost. Retrying...');
          }
        }
      };

      poll();
      pollId = window.setInterval(poll, 2000);
    };

    if (typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new EventSource(`/api/view/${activeRoom}/stream`);
      eventSource.addEventListener('snapshot', (event) => {
        if (cancelled) return;
        try {
          receivedFirstEvent = true;
          if (fallbackTimer) {
            window.clearTimeout(fallbackTimer);
            fallbackTimer = null;
          }
          const json = JSON.parse((event as MessageEvent).data) as SnapshotResponse;
          applySnapshot(json);
        } catch (err) {
          console.error('Failed to parse stream event', err);
        }
      });
      eventSource.onerror = () => {
        if (cancelled) return;
        setStatus('Connection lost. Retrying...');
        if (!receivedFirstEvent) {
          eventSource?.close();
          eventSource = null;
          startPolling();
        }
      };

      fallbackTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (receivedFirstEvent) return;
        eventSource?.close();
        eventSource = null;
        startPolling();
      }, 5000);
    } else {
      startPolling();
    }

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      eventSource?.close();
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

  const formatRoomTime = (timestamp: number | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString();
  };

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

      <section className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-pink-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-pink-300">Live view</p>
            <h2 className="text-lg font-black text-pink-600">Active rooms</h2>
          </div>
          <button
            onClick={refreshRooms}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pink-50 text-pink-500 font-black border border-pink-100 hover:bg-pink-100"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        {loadingRooms ? (
          <p className="text-pink-300 text-sm">Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-pink-300 text-sm">No active rooms yet. Start painting to appear here!</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <button
                key={room.code}
                onClick={() => {
                  setActiveRoom(room.code);
                  setRoomCodeInput(room.code);
                }}
                className={`group rounded-2xl border border-pink-100 shadow-sm overflow-hidden hover:shadow-lg transition-shadow text-left ${
                  activeRoom === room.code ? 'ring-2 ring-pink-300' : ''
                }`}
              >
                <div className="aspect-[4/3] bg-pink-50 flex items-center justify-center overflow-hidden">
                  {room.image ? (
                    <img src={room.image} alt={`Room ${room.code}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="text-pink-300 text-xs font-black uppercase tracking-[0.2em]">Waiting for paint...</div>
                  )}
                </div>
                <div className="flex items-center justify-between px-3 py-2 text-sm font-black text-pink-500 bg-white">
                  <span>{room.code}</span>
                  <span className="text-pink-300 text-xs font-semibold">{formatRoomTime(room.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

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
