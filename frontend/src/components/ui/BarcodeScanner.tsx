import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

/**
 * Scanner de codes-barres / QR par caméra — deux moteurs conservés :
 * 1. BarcodeDetector natif du navigateur (rapide, Android/Chrome)
 * 2. ZXing en JavaScript (relève automatique — iPhone/Safari et autres)
 * Saisie manuelle toujours disponible en secours.
 */
export default function BarcodeScanner({
  title = 'Scanner un code-barres',
  onClose,
  onDetected,
}: {
  title?: string;
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [engine, setEngine] = useState<'natif' | 'zxing' | null>(null);
  const [manual, setManual] = useState('');

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const emit = (code: string) => {
      if (stopped) return;
      stopped = true;
      onDetected(code);
    };

    // Moteur 1 : BarcodeDetector natif (Android / Chrome)
    async function startNative(): Promise<boolean> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD = (window as any).BarcodeDetector;
      if (!BD) return false;
      try {
        const supported: string[] = (await BD.getSupportedFormats?.()) || [];
        const wanted = ['ean_13', 'ean_8', 'code_128', 'upc_a', 'upc_e', 'qr_code'].filter(
          (f) => !supported.length || supported.includes(f),
        );
        const detector = new BD({ formats: wanted });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return false;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setEngine('natif');
        setStarting(false);

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length) {
              emit(codes[0].rawValue);
              return;
            }
          } catch { /* image pas encore prête : on réessaie */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return true;
      } catch {
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
        return false;
      }
    }

    // Moteur 2 : ZXing en JavaScript (iPhone/Safari et navigateurs sans API native)
    async function startZxing(): Promise<boolean> {
      try {
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (result) => {
            if (result) {
              controls?.stop();
              emit(result.getText());
            }
          },
        );
        setEngine('zxing');
        setStarting(false);
        return true;
      } catch {
        return false;
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Ce navigateur n'a pas accès à la caméra. Saisissez le code ci-dessous.");
        setStarting(false);
        return;
      }
      if (await startNative()) return;
      if (await startZxing()) return;
      setError("Impossible d'accéder à la caméra (autorisation refusée ?). Saisissez le code ci-dessous.");
      setStarting(false);
    }
    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 sm:m-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        {!error ? (
          <div className="rounded-xl overflow-hidden bg-black aspect-[4/3] mb-3 relative">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {starting && (
              <p className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Ouverture de la caméra…
              </p>
            )}
            {/* cadre de visée */}
            <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-24 border-2 border-white/70 rounded-lg pointer-events-none" />
            <div className="absolute inset-x-12 top-1/2 h-0.5 bg-red-500/80 pointer-events-none" />
            {engine && (
              <span className="absolute bottom-1.5 right-2 text-[10px] text-white/50">
                {engine === 'natif' ? 'détection native' : 'détection ZXing'}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-3 flex items-start gap-2">
            <Camera className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onDetected(manual.trim()); }}
          className="flex gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Ou saisir le code-barres…"
            inputMode="text"
            className="flex-1 px-3 py-3 rounded-xl border border-gray-300"
          />
          <button type="submit" className="px-5 rounded-xl bg-primary-600 text-white font-medium">OK</button>
        </form>
      </div>
    </div>
  );
}
