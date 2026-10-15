import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';

interface CameraCaptureProps {
  /** Called with a JPEG data URL for each photo taken. */
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  /** Called when the in-app camera cannot start (no permission / no camera). */
  onUnavailable: () => void;
}

const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.8;
const FLASH_MS = 150;

export const isInAppCameraSupported = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/**
 * In-app camera. Taking photos without leaving the page avoids the Android
 * problem where the browser tab is closed while the system camera is open
 * (and everything typed in the RDO is lost).
 */
export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, onUnavailable }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isReady, setIsReady] = useState(false);
  const [takenCount, setTakenCount] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let isCancelled = false;
    setIsReady(false);
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then((stream) => {
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stopStream();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      })
      .catch((error) => {
        console.error('Câmera do app indisponível:', error);
        if (!isCancelled) onUnavailable();
      });
    return () => {
      isCancelled = true;
    };
  }, [facingMode, onUnavailable]);

  useEffect(() => stopStream, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const ratio = Math.min(1, MAX_DIMENSION_PX / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    setTakenCount((c) => c + 1);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), FLASH_MS);
  }, [onCapture]);

  const roundButton = 'flex items-center justify-center rounded-full text-white transition active:scale-90';

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black" role="dialog" aria-label="Câmera">
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          onLoadedData={() => setIsReady(true)}
          className="max-w-full max-h-full object-contain"
        />
        {!isReady && (
          <p className="absolute flex items-center gap-2 text-white text-lg font-bold">
            <Loader2 className="w-7 h-7 animate-spin" /> Abrindo câmera...
          </p>
        )}
        {isFlashing && <div className="absolute inset-0 bg-white/70" />}
        <button
          type="button"
          onClick={onClose}
          className={`${roundButton} absolute top-3 right-3 w-14 h-14 bg-black/50`}
          aria-label="Fechar câmera"
        >
          <X className="w-8 h-8" />
        </button>
        {takenCount > 0 && (
          <span className="absolute top-4 left-4 px-4 py-2 rounded-full bg-[#C5A059] text-white text-lg font-black">
            {takenCount} {takenCount === 1 ? 'foto' : 'fotos'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-around px-6 py-6 bg-black">
        <button
          type="button"
          onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
          className={`${roundButton} w-16 h-16 bg-white/15`}
          aria-label="Trocar câmera"
        >
          <RefreshCw className="w-8 h-8" />
        </button>
        <button
          type="button"
          onClick={takePhoto}
          disabled={!isReady}
          className="w-24 h-24 rounded-full border-[6px] border-white bg-[#C5A059] active:scale-90 transition disabled:opacity-40"
          aria-label="Tirar foto"
        />
        <button
          type="button"
          onClick={onClose}
          className={`${roundButton} w-16 h-16 bg-emerald-600`}
          aria-label="Pronto, voltar ao RDO"
        >
          <Check className="w-9 h-9" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};
