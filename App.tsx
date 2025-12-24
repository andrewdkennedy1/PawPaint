
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Trash2, Maximize, Minimize, Lock, Unlock, Download, PawPrint, Palette, X, ShieldCheck, PlusSquare, Share } from 'lucide-react';
import Canvas from './components/Canvas';
import { COLORS, BRUSH_SIZES } from './constants';

const App: React.FC = () => {
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showParentalGate, setShowParentalGate] = useState(false);
  const [isUnlockDropdownOpen, setIsUnlockDropdownOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
  
  // Parental Gate State
  const [gateCode, setGateCode] = useState<string>("");
  const [userAttempt, setUserAttempt] = useState<string>("");

  const clearCanvasRef = useRef<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `pawprint-${Date.now()}.png`;
      link.href = url;
      link.click();
      showToast("Art saved to gallery! ✨", "success");
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    setIsMenuOpen(false);
    setIsUnlockDropdownOpen(false);
    showToast("Safe Mode 🔒 (Adults: tap hidden top-right gear)");
    if (!isFullscreen) toggleFullscreen().catch(() => {});
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setIsUnlockDropdownOpen(false);
    showToast("Safe Mode Off 🔓");
  };

  const onPawClick = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    } else {
      generateGateCode();
      setShowParentalGate(true);
    }
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
      />

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

      {/* Main Control: Hidden Discrete Paw Button */}
      {!isLocked && (
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

                <button 
                  onClick={() => setShowParentalGate(false)}
                  className="text-gray-400 text-[10px] font-bold uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Floating Hard-to-get Menu */}
          {isMenuOpen && (
            <div className="absolute bottom-20 left-0 w-[85vw] max-w-sm bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-pink-100 p-6 flex flex-col gap-6 animate-slide-up">
              <h2 className="text-pink-500 font-black flex items-center gap-2 text-xl tracking-tight">
                <Palette size={24} /> PawPaint Controls
              </h2>

              {/* Color Palette */}
              <div className="grid grid-cols-6 gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      showToast(`Switched to ${c}`, 'info');
                    }}
                    className={`w-full aspect-square rounded-2xl border-4 transition-all active:scale-90 ${color === c ? 'border-pink-500 scale-110' : 'border-transparent shadow-sm'}`}
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
              <div className="grid grid-cols-4 gap-3">
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
                  onClick={handleLock}
                  className="flex flex-col items-center gap-1 p-4 rounded-3xl bg-pink-600 text-white shadow-xl shadow-pink-200 hover:bg-pink-700 transition-colors"
                >
                  <Lock size={24} />
                  <span className="text-[10px] font-black uppercase tracking-wider">SAFE</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Secret Adult Unlock Mechanism - Invisible in top-right */}
      <div className="absolute top-0 right-0 p-6 z-[60]">
        <div className="relative">
          <button
            onClick={() => setIsUnlockDropdownOpen(!isUnlockDropdownOpen)}
            className={`w-16 h-16 flex items-center justify-center rounded-full transition-all duration-500 ${
              isLocked ? 'bg-transparent text-transparent hover:bg-black/5 hover:text-gray-300' : 'bg-transparent text-transparent'
            }`}
          >
            <Settings size={32} />
          </button>
          
          {isUnlockDropdownOpen && (
            <div className="absolute right-0 mt-4 w-56 bg-white rounded-[2rem] shadow-2xl border border-pink-50 py-3 z-[70] overflow-hidden animate-bounce-in">
              <div className="px-6 py-2 border-b border-gray-50 mb-1">
                <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Parental Controls</span>
              </div>
              <button
                onClick={handleUnlock}
                className="w-full px-6 py-5 text-left flex items-center gap-4 text-pink-600 font-black hover:bg-pink-50 transition-colors"
              >
                <Unlock size={24} />
                Exit Safe Mode
              </button>
              <button
                onClick={() => {
                  clearCanvasRef.current?.();
                  setIsUnlockDropdownOpen(false);
                  showToast("Canvas cleared ✨");
                }}
                className="w-full px-6 py-5 text-left flex items-center gap-4 text-red-500 font-black hover:bg-red-50 transition-colors border-t border-gray-50"
              >
                <Trash2 size={24} />
                Wipe Canvas
              </button>
            </div>
          )}
        </div>
      </div>

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
