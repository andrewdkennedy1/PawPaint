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

const LIVE_POLL_INTERVAL_MS = 500;
const LIVE_STREAM_FALLBACK_MS = 2000;

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
    let pollInFlight = false;

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
        if (pollInFlight) return;
        pollInFlight = true;
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
        } finally {
          pollInFlight = false;
        }
      };

      poll();
      pollId = window.setInterval(poll, LIVE_POLL_INTERVAL_MS);
    };

    if (typeof window !== 'undefined' && 'EventSource' in window) {
      eventSource = new EventSource(`/api/view/${activeRoom}/stream?fast=1`);
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
        eventSource?.close();
        eventSource = null;
        startPolling();
      };

      fallbackTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (receivedFirstEvent) return;
        eventSource?.close();
        eventSource = null;
        startPolling();
      }, LIVE_STREAM_FALLBACK_MS);
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

  const handleDownload = async () => {
    if (!snapshot.image) return;
    try {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `pawpaint-${activeRoom || 'room'}.jpg`;
        link.click();
      };
      image.src = snapshot.image;
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-pink-50 via-white to-white flex flex-col text-pink-600">
      <header className="flex items-center justify-center gap-3 px-6 pt-6 pb-4">
        <PawPrint size={32} />
        <div>
          <p className="text-xs uppercase font-black tracking-[0.2em] text-pink-300 text-center">PawPaint</p>
          <h1 className="text-2xl font-black text-center">Live Viewer</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="w-full max-w-6xl mx-auto grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="w-full bg-white rounded-3xl shadow-2xl border border-pink-100 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-pink-400 bg-pink-50 border-b border-pink-100">
              <div className="flex flex-col">
                <span>Room: {activeRoom || '—'}</span>
                <span>{formattedUpdatedAt ? `Updated ${formattedUpdatedAt}` : 'No updates yet'}</span>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!snapshot.image}
                className="px-3 py-2 rounded-xl bg-pink-500 text-white font-black text-xs shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pink-600"
              >
                Save image
              </button>
            </div>
            {snapshot.image ? (
              <img src={snapshot.image} alt="Live PawPaint canvas" className="w-full h-auto" />
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center text-pink-300 text-sm font-black uppercase tracking-[0.2em] bg-pink-50">
                No paint yet. Waiting for the artist...
              </div>
            )}
          </section>

          <div className="flex flex-col gap-6">
            <form onSubmit={onSubmit} className="w-full bg-white rounded-3xl shadow-xl border border-pink-100 p-6">
              <label className="block text-xs uppercase font-black tracking-[0.2em] text-pink-300 mb-3">
                Room code
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
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
                  className="px-4 py-3 bg-pink-500 text-white rounded-2xl font-black shadow-md flex items-center justify-center gap-2 hover:bg-pink-600"
                >
                  <Wifi size={18} />
                  Join
                </button>
              </div>
              <p className="text-pink-400 text-sm mt-3">{status}</p>
            </form>

            <section className="w-full bg-white rounded-3xl shadow-xl border border-pink-100 p-5">
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

              <div className="max-h-[40vh] lg:max-h-[55vh] overflow-y-auto pr-1">
                {loadingRooms ? (
                  <p className="text-pink-300 text-sm">Loading rooms...</p>
                ) : rooms.length === 0 ? (
                  <p className="text-pink-300 text-sm">No active rooms yet. Start painting to appear here!</p>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Viewer;
