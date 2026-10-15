import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ViewerPhoto {
  url: string;
  caption?: string;
  tag?: string;
  timestamp?: string;
}

interface PhotoViewerProps {
  photos: ViewerPhoto[];
  startIndex?: number;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.75;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

type Point = { x: number; y: number };

/**
 * Fullscreen photo viewer with zoom: pinch (2 fingers), double tap, mouse wheel,
 * +/- buttons and drag to move the zoomed photo.
 */
export const PhotoViewer: React.FC<PhotoViewerProps> = ({ photos, startIndex = 0, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  const pointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);
  const dragStart = useRef<{ pointer: Point; offset: Point } | null>(null);
  const lastTap = useRef(0);

  const photo = photos[index];
  const hasMany = photos.length > 1;

  const applyScale = useCallback((next: number) => {
    const clamped = clampScale(next);
    setScale(clamped);
    if (clamped === MIN_SCALE) setOffset({ x: 0, y: 0 });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + photos.length) % photos.length);
      resetZoom();
    },
    [photos.length, resetZoom]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasMany) goTo(1);
      if (e.key === 'ArrowLeft' && hasMany) goTo(-1);
      if (e.key === '+' || e.key === '=') setScale((s) => clampScale(s + ZOOM_STEP));
      if (e.key === '-') applyScale(scale - ZOOM_STEP);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goTo, hasMany, applyScale, scale]);

  const distanceBetweenPointers = () => {
    const [a, b] = Array.from(pointers.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      pinchStart.current = { distance: distanceBetweenPointers(), scale };
      dragStart.current = null;
      return;
    }

    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (scale > 1) resetZoom();
      else setScale(DOUBLE_TAP_SCALE);
      return;
    }
    lastTap.current = now;
    dragStart.current = { pointer: { x: e.clientX, y: e.clientY }, offset };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const ratio = distanceBetweenPointers() / pinchStart.current.distance;
      applyScale(pinchStart.current.scale * ratio);
      return;
    }
    if (dragStart.current && scale > 1) {
      setOffset({
        x: dragStart.current.offset.x + (e.clientX - dragStart.current.pointer.x),
        y: dragStart.current.offset.y + (e.clientY - dragStart.current.pointer.y),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    applyScale(scale + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  if (!photo) return null;

  const roundButton =
    'flex items-center justify-center w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white transition backdrop-blur-sm';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95 select-none" role="dialog" aria-label="Ver foto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 p-3 text-white">
        <div className="min-w-0">
          {photo.caption && <p className="text-base font-bold truncate">{photo.caption}</p>}
          <p className="text-sm text-white/60">
            {hasMany && `${index + 1} de ${photos.length}`}
            {photo.tag && ` • ${photo.tag}`}
            {photo.timestamp && ` • ${photo.timestamp}`}
          </p>
        </div>
        <button type="button" onClick={onClose} className={roundButton} aria-label="Fechar foto">
          <X className="w-8 h-8" />
        </button>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 overflow-hidden flex items-center justify-center"
        style={{ touchAction: 'none', cursor: scale > 1 ? 'grab' : 'zoom-in' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <img
          src={photo.url}
          alt={photo.caption || 'Foto da obra'}
          draggable={false}
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: pointers.current.size > 0 ? 'none' : 'transform 150ms ease-out',
          }}
        />

        {hasMany && (
          <>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => goTo(-1)}
              className={`${roundButton} absolute left-3 top-1/2 -translate-y-1/2`}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-9 h-9" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => goTo(1)}
              className={`${roundButton} absolute right-3 top-1/2 -translate-y-1/2`}
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-9 h-9" />
            </button>
          </>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-4 p-4 pb-6">
        <button
          type="button"
          onClick={() => applyScale(scale - ZOOM_STEP)}
          disabled={scale <= MIN_SCALE}
          className={`${roundButton} disabled:opacity-30`}
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="w-7 h-7" />
        </button>
        <span className="w-16 text-center text-white font-bold text-lg tabular-nums">{scale.toFixed(1)}x</span>
        <button
          type="button"
          onClick={() => applyScale(scale + ZOOM_STEP)}
          disabled={scale >= MAX_SCALE}
          className={`${roundButton} disabled:opacity-30`}
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="w-7 h-7" />
        </button>
        <button type="button" onClick={resetZoom} className={roundButton} aria-label="Voltar ao tamanho normal">
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
