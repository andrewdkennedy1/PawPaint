
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Trash2, Maximize, Minimize, Download, PawPrint, Palette, X, ShieldCheck, PlusSquare, Share, Shuffle, Timer, Sparkles, Zap } from 'lucide-react';
import Canvas from './components/Canvas';
import { COLORS, COLOR_THEMES, BRUSH_SIZES } from './constants';
import Viewer from './components/Viewer';

const App: React.FC = () => {
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showParentalGate, setShowParentalGate] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showGuidedAccessGuide, setShowGuidedAccessGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
  const [autoRandomize, setAutoRandomize] = useState(true);
  const [autoIntervalMs, setAutoIntervalMs] = useState(8000);
  const [themeId, setThemeId] = useState(COLOR_THEMES[0]?.id ?? 'default');
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [isAttractMode, setIsAttractMode] = useState(false);
  const [attractIntensity, setAttractIntensity] = useState<'low' | 'med' | 'high'>('med');
  
  // Parental Gate State
  const [gateCode, setGateCode] = useState<string>("");
  const [userAttempt, setUserAttempt] = useState<string>("");
  const [roomCode, setRoomCode] = useState<string>("");
  const [snapshotDirty, setSnapshotDirty] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clearCanvasRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const el = containerRef.current as any;
        if (!el) return;
        const isAlreadyFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
        if (!isAlreadyFullscreen) {
          if (el.requestFullscreen) await el.requestFullscreen();
          else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        }
      } catch (err) {
        console.warn('Auto fullscreen failed', err);
      }
    }, 600);
    return () => clearTimeout(id);
  }, []);

  const showToast = (message: string, type: 'info' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    showToast("Welcome to PawPaint! 🐾 Tap the paw to start.");

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('pawpaint-room-code');
    const code = (stored || Math.random().toString(36).slice(2, 8)).toUpperCase();
    setRoomCode(code);
    localStorage.setItem('pawpaint-room-code', code);
  }, []);

  const markActivity = useCallback(() => setSnapshotDirty(true), []);

  const pushSnapshot = useCallback(async () => {
    if (!roomCode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/webp', 0.7);
      await fetch(`/api/view/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
    } catch (err) {
      console.error('Snapshot sync failed', err);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!snapshotDirty) return undefined;
    const id = setTimeout(() => {
      pushSnapshot();
      setSnapshotDirty(false);
    }, 800);
    return () => clearTimeout(id);
  }, [snapshotDirty, pushSnapshot]);

  useEffect(() => {
    if (!roomCode) return undefined;
    const id = setInterval(() => {
      pushSnapshot();
    }, 15000);
    return () => clearInterval(id);
  }, [roomCode, pushSnapshot]);

  useEffect(() => {
    if (roomCode) {
      setSnapshotDirty(true);
    }
  }, [roomCode]);

  const generateGateCode = () => {
    const code = Array.from({ length: 3 }, () => Math.floor(Math.random() * 9) + 1).join("");
    setGateCode(code);
    setUserAttempt("");
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const el = containerRef.current as any;
        if (el?.requestFullscreen) await el.requestFullscreen();
        else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast("Installing PawPaint... 🐾", "success");
      }
      setDeferredPrompt(null);
    } else {
      // Logic for iOS/iPad
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const themeColors = useMemo(() => {
    const theme = COLOR_THEMES.find((t) => t.id === themeId) ?? COLOR_THEMES[0];
    return theme?.colors ?? COLORS;
  }, [themeId]);

  const palette = useMemo(() => {
    return Array.from(new Set([...themeColors, ...customColors]));
  }, [themeColors, customColors]);

  const lureCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isAttractMode) return undefined;
    const canvas = lureCanvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const level = attractIntensity;
    const counts = { low: 12, med: 20, high: 32 };
    const speed = { low: 0.6, med: 0.9, high: 1.2 };
    const streakChance = { low: 0.02, med: 0.04, high: 0.07 };

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const pickColor = () => palette[Math.floor(Math.random() * palette.length)] ?? '#f472b6';

    const particles = Array.from({ length: counts[level] }, () => ({
      x: rand(0, canvas.width),
      y: rand(0, canvas.height),
      vx: rand(-1, 1) * speed[level],
      vy: rand(-1, 1) * speed[level],
      size: rand(6, 12),
      color: pickColor(),
    }));

    const laser = {
      x: rand(0, canvas.width),
      y: rand(0, canvas.height),
      vx: rand(-2, 2) * 1.5,
      vy: rand(-2, 2) * 1.5,
      size: 10,
      color: '#facc15',
    };

    const streaks: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
    let touchX: number | null = null;
    let touchY: number | null = null;
    let touchTime = 0;

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      touchX = t.clientX;
      touchY = t.clientY;
      touchTime = Date.now();
    };
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      const hasTouch = touchX !== null && touchY !== null && now - touchTime < 800;

      if (Math.random() < streakChance[level]) {
        streaks.push({
          x: rand(0, canvas.width),
          y: rand(0, canvas.height),
          vx: rand(-3, 3) * (1 + speed[level]),
          vy: rand(-3, 3) * (1 + speed[level]),
          life: rand(20, 40),
          color: pickColor(),
        });
      }

      particles.forEach((p) => {
        if (hasTouch && touchX !== null && touchY !== null) {
          const dx = p.x - touchX;
          const dy = p.y - touchY;
          const dist = Math.max(40, Math.sqrt(dx * dx + dy * dy));
          p.vx += (dx / dist) * 0.3;
          p.vy += (dy / dist) * 0.3;
        }

        p.vx += rand(-0.05, 0.05);
        p.vy += rand(-0.05, 0.05);
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 14;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = 0.85;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      laser.vx += rand(-0.2, 0.2);
      laser.vy += rand(-0.2, 0.2);
      laser.x += laser.vx * 2;
      laser.y += laser.vy * 2;
      if (laser.x < 0 || laser.x > canvas.width) laser.vx *= -1;
      if (laser.y < 0 || laser.y > canvas.height) laser.vy *= -1;
      ctx.beginPath();
      ctx.fillStyle = laser.color;
      ctx.shadowBlur = 22;
      ctx.shadowColor = laser.color;
      ctx.globalAlpha = 0.95;
      ctx.arc(laser.x, laser.y, laser.size, 0, Math.PI * 2);
      ctx.fill();

      for (let i = streaks.length - 1; i >= 0; i -= 1) {
        const s = streaks[i];
        const x2 = s.x + s.vx * 6;
        const y2 = s.y + s.vy * 6;
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = s.color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 4;
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        s.x = x2;
        s.y = y2;
        s.life -= 1;
        if (s.life <= 0) streaks.splice(i, 1);
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [isAttractMode, attractIntensity, palette]);

  useEffect(() => {
    if (!autoRandomize) return undefined;
    const intervalId = setInterval(() => {
      setColor((prev) => {
        if (palette.length <= 1) return prev;
        let next = prev;
        while (next === prev) {
          next = palette[Math.floor(Math.random() * palette.length)];
        }
        return next;
      });
      setBrushSize((prev) => {
        if (BRUSH_SIZES.length <= 1) return prev;
        let next = prev;
        while (next === prev) {
          next = BRUSH_SIZES[Math.floor(Math.random() * BRUSH_SIZES.length)];
        }
        return next;
      });
    }, autoIntervalMs);

    return () => clearInterval(intervalId);
  }, [autoRandomize, autoIntervalMs, palette]);

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const canShareFiles = (file: File) => {
        if (!navigator.share) return false;
        const canShare = (navigator as any).canShare;
        if (typeof canShare !== 'function') return true;
        return canShare({ files: [file] });
      };
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const filename = `pawprint-${Date.now()}.png`;
        const file = new File([blob], filename, { type: blob.type });
        if (canShareFiles(file)) {
          try {
            await navigator.share({ files: [file], title: 'PawPaint', text: 'My PawPaint masterpiece' });
            showToast("Share to Photos to save ✨", "success");
            return;
          } catch {
            // Fall through to other options.
          }
        }

        const url = URL.createObjectURL(blob);
        if (isIOS) {
          window.open(url, '_blank');
          showToast("Press & hold the image to Save ✨", "info");
        } else {
          const link = document.createElement('a');
          link.download = filename;
          link.href = url;
          link.click();
          showToast("Art saved to downloads! ✨", "success");
        }
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 'image/png');
    }
  };

  const onPawClick = () => {
    if (showParentalGate) {
      setShowParentalGate(false);
      return;
    }

    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }

    generateGateCode();
    setShowParentalGate(true);
  };

  const handleDigitPress = (digit: number) => {
    const nextAttempt = userAttempt + digit;
    setUserAttempt(nextAttempt);
    
    if (nextAttempt.length === 3) {
      if (nextAttempt === gateCode) {
        setShowParentalGate(false);
        setIsMenuOpen(true);
        showToast("Human Verified! 👋", "success");
      } else {
        setShowParentalGate(false);
        showToast("Nice try, kitty! 😺", "info");
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden bg-[#fffcf2] select-none touch-none">
      
      {/* Brand Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] rotate-12">
        <PawPrint size={400} />
      </div>

      {/* Canvas Layer */}
      <Canvas
        color={color}
        brushSize={brushSize}
        onClearRef={clearCanvasRef}
        isFullscreen={isFullscreen}
        canvasRef={canvasRef}
        onActivity={markActivity}
      />

      {/* Attract Mode Layer */}
      {isAttractMode && (
        <canvas
          ref={lureCanvasRef}
          className="absolute inset-0 z-20 pointer-events-none"
        />
      )}

      {/* Discrete Toast Notification */}
      {toast && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in pointer-events-none">
          <div className={`px-6 py-3 rounded-full shadow-lg backdrop-blur-md flex items-center gap-3 border transition-all ${
            toast.type === 'success' 
              ? 'bg-pink-500 text-white border-pink-400' 
              : 'bg-indigo-600 text-white border-indigo-400'
          }`}>
            <span className="font-medium whitespace-nowrap">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Control: Paw Button */}
      <div className="absolute bottom-8 left-8 z-40">
        <button
          onClick={onPawClick}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
            isMenuOpen ? 'bg-pink-500 text-white rotate-90 scale-110' : 'bg-white/80 text-pink-400 hover:bg-white hover:scale-105'
          }`}
        >
          {isMenuOpen ? <X size={32} /> : <PawPrint size={32} />}
        </button>

          {/* Parental Gate Modal (Human Logic: Read and Match) */}
          {showParentalGate && (
            <div className="absolute bottom-20 left-0 w-[80vw] max-w-xs bg-white/98 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-pink-100 p-8 animate-slide-up">
              <div className="flex flex-col items-center gap-6">
                <div className="w-14 h-14 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                
                <div className="text-center">
                  <h3 className="text-pink-600 font-black text-xl tracking-tight">Parental Lock</h3>
                  <p className="text-pink-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">Humans only please</p>
                  
                  <div className="bg-pink-50/50 px-6 py-3 rounded-2xl mb-2">
                    <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Enter this code:</p>
                    <p className="text-pink-600 text-3xl font-black tracking-[0.3em]">
                      {gateCode.split('').join(' ')}
                    </p>
                  </div>

                  <div className="bg-indigo-50/60 px-6 py-3 rounded-2xl mb-2 border border-indigo-100">
                    <p className="text-indigo-400 text-[10px] font-bold uppercase mb-1">Viewer room</p>
                    <p className="text-indigo-600 text-2xl font-black tracking-[0.25em]">{roomCode || '...'}</p>
                    <p className="text-indigo-300 text-[10px] font-bold uppercase mt-1">Open pawpaint.catcafe.space/view</p>
                  </div>
                  
                  {/* Visual feedback of entry */}
                  <div className="flex justify-center gap-2 h-2 mt-4">
                    {[0, 1, 2].map(i => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${userAttempt.length > i ? 'bg-pink-500' : 'bg-pink-100'}`} 
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handleDigitPress(num)}
                      className="aspect-square bg-pink-50/50 text-pink-600 text-xl font-black rounded-2xl hover:bg-pink-500 hover:text-white transition-all active:scale-90 flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* Floating Hard-to-get Menu */}
          {isMenuOpen && (
            <div className="absolute bottom-20 left-0 w-[85vw] max-w-sm bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-pink-100 p-6 flex flex-col gap-6 animate-slide-up">
              <h2 className="text-pink-500 font-black flex items-center gap-2 text-xl tracking-tight">
                <Palette size={24} /> PawPaint Controls
              </h2>

              {/* Theme Controls */}
              <div className="flex items-center justify-between bg-pink-50 rounded-3xl px-4 py-3 gap-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-pink-500">
                  Theme
                </div>
                <select
                  value={themeId}
                  onChange={(e) => setThemeId(e.target.value)}
                  className="bg-white/90 text-pink-600 font-black text-xs rounded-2xl px-4 py-2 shadow-sm border border-pink-100"
                >
                  {COLOR_THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 bg-white/90 text-pink-600 font-black text-xs rounded-2xl px-4 py-2 shadow-sm border border-pink-100 cursor-pointer">
                  <span>Custom</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const next = e.target.value;
                      setColor(next);
                      setCustomColors((prev) => (prev.includes(next) ? prev : [...prev, next]));
                    }}
                    className="h-6 w-6 rounded-full border-0 p-0 bg-transparent"
                  />
                </label>
              </div>

              {/* Color Palette */}
              <div className="grid grid-cols-4 gap-4 place-items-center">
                {palette.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      showToast(`Switched to ${c}`, 'info');
                    }}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-4 transition-all active:scale-90 ${color === c ? 'border-pink-500 scale-110' : 'border-transparent shadow-sm'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Brush Sizes */}
              <div className="flex items-center justify-between bg-pink-50 rounded-3xl p-2 gap-1">
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`flex-1 flex items-center justify-center py-4 rounded-2xl transition-all ${brushSize === size ? 'bg-white text-pink-500 shadow-md scale-[1.02]' : 'text-pink-300 hover:text-pink-400'}`}
                  >
                    <div className="rounded-full bg-current shadow-inner" style={{ width: size/4 + 6, height: size/4 + 6 }} />
                  </button>
                ))}
              </div>

              {/* Utility Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsAttractMode((prev) => !prev)}
                  className={`flex flex-col items-center gap-1 p-4 rounded-3xl transition-colors ${
                    isAttractMode
                      ? 'bg-orange-600 text-white shadow-xl shadow-orange-200 hover:bg-orange-700'
                      : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  }`}
                >
                  <Sparkles size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {isAttractMode ? 'LURE ON' : 'LURE OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const levels: Array<'low' | 'med' | 'high'> = ['low', 'med', 'high'];
                    const idx = levels.indexOf(attractIntensity);
                    const next = levels[(idx + 1) % levels.length];
                    setAttractIntensity(next);
                    showToast(`Lure intensity: ${next}`, 'info');
                  }}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                >
                  <Zap size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    INTENSITY {attractIntensity.toUpperCase()}
                  </span>
                </button>
                <button
                  onClick={() => setAutoRandomize((prev) => !prev)}
                  className={`flex flex-col items-center gap-1 p-4 rounded-3xl transition-colors ${
                    autoRandomize
                      ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 hover:bg-emerald-700'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  <Shuffle size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {autoRandomize ? 'AUTO ON' : 'AUTO OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const speeds = [4000, 8000, 12000];
                    const idx = speeds.indexOf(autoIntervalMs);
                    const next = speeds[(idx + 1) % speeds.length];
                    setAutoIntervalMs(next);
                    showToast(`Auto speed: ${Math.round(next / 1000)}s`, 'info');
                  }}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                >
                  <Timer size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    SPEED {Math.round(autoIntervalMs / 1000)}s
                  </span>
                </button>
                <button
                  onClick={() => { clearCanvasRef.current?.(); setIsMenuOpen(false); showToast("Squeaky clean! ✨"); }}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">CLEAR</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                >
                  <Download size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">SAVE</span>
                </button>
                <button
                  onClick={handleInstall}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors animate-pulse"
                >
                  <PlusSquare size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">INSTALL</span>
                </button>
                <button
                  onClick={() => toggleFullscreen().catch(() => {})}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors"
                >
                  {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {isFullscreen ? 'EXIT FS' : 'FULLSCREEN'}
                  </span>
                </button>
                <button
                  onClick={() => setShowGuidedAccessGuide(true)}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  <ShieldCheck size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">GUIDED</span>
                </button>
              </div>
            </div>
          )}
        </div>

      {/* iPad / iOS Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl p-8 animate-bounce-in text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
              <PlusSquare size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Install on iPad</h3>
              <p className="text-gray-500 text-sm leading-relaxed">To use PawPaint offline and in full screen, follow these steps:</p>
            </div>
            
            <div className="w-full space-y-4 text-left">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm">
                  <Share className="text-blue-500" size={20} />
                </div>
                <p className="text-sm font-bold text-gray-700">1. Tap the <span className="text-blue-500">Share</span> button</p>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm">
                  <PlusSquare className="text-gray-600" size={20} />
                </div>
                <p className="text-sm font-bold text-gray-700">2. Tap <span className="text-gray-900 underline underline-offset-4">Add to Home Screen</span></p>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-4 bg-pink-500 text-white font-black rounded-2xl shadow-lg shadow-pink-200 active:scale-95 transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Guided Access Modal */}
      {showGuidedAccessGuide && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl p-8 animate-bounce-in text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Guided Access</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Use iPad Guided Access to stop app switching while PawPaint is open.
              </p>
            </div>
            <div className="w-full space-y-4 text-left">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-600 font-black">
                  1
                </div>
                <p className="text-sm font-bold text-gray-700">
                  Enable Guided Access in Settings / Accessibility.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-600 font-black">
                  2
                </div>
                <p className="text-sm font-bold text-gray-700">
                  Start it with triple-click on the side button.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-600 font-black">
                  3
                </div>
                <p className="text-sm font-bold text-gray-700">
                  End with another triple-click and your passcode.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuidedAccessGuide(false)}
              className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-in {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          70% { transform: translate(-50%, 15%); opacity: 1; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slide-up {
          0% { transform: translateY(30px) scale(0.9); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        canvas {
          cursor: crosshair;
        }
        button {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default App;
