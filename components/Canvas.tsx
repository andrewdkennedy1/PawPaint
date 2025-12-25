
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '../types';

interface CanvasProps {
  color: string;
  brushSize: number;
  onClearRef: React.MutableRefObject<(() => void) | null>;
  isFullscreen: boolean;
}

interface PointerState {
  x: number;
  y: number;
  width: number;
  time: number;
}

const Canvas: React.FC<CanvasProps> = ({ color, brushSize, onClearRef, isFullscreen }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingRef = useRef(false);
  
  // History for smoothing and dynamics
  const points = useRef<PointerState[]>([]);
  const lastVelocity = useRef<number>(0);
  const lastWidth = useRef<number>(brushSize);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = oldWidth;
    tempCanvas.height = oldHeight;
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const timeoutId = setTimeout(resizeCanvas, 100);
    window.addEventListener('resize', resizeCanvas);
    
    onClearRef.current = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(timeoutId);
    };
  }, [resizeCanvas, onClearRef]);

  useEffect(() => {
    const timer = setTimeout(resizeCanvas, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, resizeCanvas]);

  const getPointFromClient = (clientX: number, clientY: number): PointerState => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, width: brushSize, time: Date.now() };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: brushSize,
      time: Date.now()
    };
  };

  const startStroke = (clientX: number, clientY: number) => {
    setIsDrawing(true);
    drawingRef.current = true;
    const state = getPointFromClient(clientX, clientY);
    points.current = [state, state];
    lastWidth.current = brushSize;
    lastVelocity.current = 0;
    
    // Set up canvas properties for "Wet Paint" texture
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const drawStroke = (clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const currentPoint = getPointFromClient(clientX, clientY);
    const prevPoint = points.current[points.current.length - 1];
    
    // Calculate Speed Dynamics
    const dist = Math.sqrt(Math.pow(currentPoint.x - prevPoint.x, 2) + Math.pow(currentPoint.y - prevPoint.y, 2));
    const time = currentPoint.time - prevPoint.time;
    const velocity = time > 0 ? dist / time : 0;
    
    // Smooth out velocity
    const smoothedVelocity = velocity * 0.3 + lastVelocity.current * 0.7;
    lastVelocity.current = smoothedVelocity;

    // Determine width based on speed: slower = thicker, faster = thinner
    // We map velocity (0 to ~5) to a scale factor (1.2 to 0.4)
    const baseWidth = brushSize;
    const targetWidth = baseWidth * Math.max(0.3, Math.min(1.5, 1.5 - (smoothedVelocity / 3)));
    
    // Smooth width transitions
    const newWidth = targetWidth * 0.2 + lastWidth.current * 0.8;
    lastWidth.current = newWidth;
    currentPoint.width = newWidth;

    points.current.push(currentPoint);

    if (points.current.length > 3) {
      const p0 = points.current[points.current.length - 3];
      const p1 = points.current[points.current.length - 2];
      const p2 = points.current[points.current.length - 1];

      // Midpoints for quadratic curve smoothing
      const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      ctx.beginPath();
      
      // Brush Texture Styling
      ctx.strokeStyle = color;
      ctx.lineWidth = p1.width;
      
      // Add "Wet Paint" edge texture using shadow
      ctx.shadowBlur = p1.width / 4;
      ctx.shadowColor = color;
      
      // Subtle transparency for paint overlay feel
      ctx.globalAlpha = 0.95;

      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
      ctx.stroke();
      
      // Clean up for next segment
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      
      // Keep buffer small
      points.current.shift();
    }
  };

  const stopStroke = () => {
    setIsDrawing(false);
    drawingRef.current = false;
    points.current = [];
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startStroke(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    drawStroke(e.clientX, e.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startStroke(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    drawStroke(e.clientX, e.clientY);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const touch = e.touches[0];
      startStroke(touch.clientX, touch.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const touch = e.touches[0];
      drawStroke(touch.clientX, touch.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stopStroke();
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [brushSize, color]);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopStroke}
      onPointerCancel={stopStroke}
      onPointerLeave={stopStroke}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopStroke}
      onMouseLeave={stopStroke}
      className="fixed inset-0 w-full h-full cursor-crosshair bg-white touch-none"
      style={{ touchAction: 'none' }}
    />
  );
};

export default Canvas;
