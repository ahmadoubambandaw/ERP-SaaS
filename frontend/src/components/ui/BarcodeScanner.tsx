import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

/**
 * Scanner de codes-barres / QR par caméra, compatible tous navigateurs
 * (iPhone Safari inclus) grâce au décodage JavaScript ZXing.
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
  const [manual, setManual] = useState('');

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let stopped = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Ce navigateur n'a pas accès à la caméra. Saisissez le code ci-dessous.");
        setStarting(false);
        return;
      }
      try {
        const reader = new BrowserMultiFormatReader();
        // undefined = laisse le navigateur choisir ; on demande la caméra arrière via contraintes
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (result) => {
            if (result && !stopped) {
              stopped = true;
              controls?.stop();
              onDetected(result.getText());
            }
          },
        );
        setStarting(false);
      } catch {
        setError("Impossible d'accéder à la caméra (autorisation refusée ?). Saisissez le code ci-dessous.");
        setStarting(false);
      }
    }
    start();

    return () => {
      stopped = true;
      controls?.stop();
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
