import { useEffect, useRef, useState } from 'react';
import { Volume2, Pause, Loader2 } from 'lucide-react';

const AUDIO_URL = '/audio/naatal-wolof.mp3';

/**
 * Bouton « Écouter en wolof » : présentation audio de Naatal pour les
 * visiteurs qui préfèrent écouter que lire. Le bouton ne s'affiche que
 * si le fichier audio a été déposé dans public/audio/naatal-wolof.mp3.
 */
export default function AudioGuide({ className = '' }: { className?: string }) {
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Vérifie que le MP3 existe vraiment : le fallback SPA renvoie du HTML
    // avec un statut 200, donc on contrôle le Content-Type.
    let cancelled = false;
    fetch(AUDIO_URL, { method: 'HEAD' })
      .then((res) => {
        const type = res.headers.get('content-type') || '';
        if (!cancelled && res.ok && !type.includes('text/html')) setAvailable(true);
      })
      .catch(() => { /* pas de fichier : bouton masqué */ });
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, []);

  if (!available) return null;

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(AUDIO_URL);
      audio.preload = 'auto';
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration);
      });
      audio.addEventListener('ended', () => { setPlaying(false); setProgress(0); });
      audio.addEventListener('waiting', () => setLoading(true));
      audio.addEventListener('playing', () => setLoading(false));
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      audio.play()
        .then(() => { setPlaying(true); setLoading(false); })
        .catch(() => setLoading(false));
    }
  };

  return (
    <button
      onClick={toggle}
      className={`relative inline-flex items-center gap-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium pl-4 pr-5 py-2.5 rounded-full transition-colors overflow-hidden ${className}`}
      aria-label={playing ? 'Mettre en pause' : 'Écouter la présentation en wolof'}
    >
      {/* Barre de progression en fond */}
      <span
        className="absolute inset-y-0 left-0 bg-white/15 transition-[width] duration-300 pointer-events-none"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
      <span className="relative flex items-center gap-2.5">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        {playing ? 'Pause' : 'Dégg ko ci wolof 🔊'}
      </span>
    </button>
  );
}
