'use client';
import { useEffect, useRef } from 'react';
import { useStore } from './Store';
import { primeAudio, playSound } from '@/lib/sound';

export function SoundControls() {
  const { sound, setSound } = useStore();
  return <details className="sound-picker"><summary>{sound.muted || !sound.volume ? 'Звук выкл.' : 'Звук вкл.'}</summary><div className="sound-menu">
    <label className="sound-toggle"><input type="checkbox" checked={!sound.muted} onChange={e => { primeAudio(); setSound({ ...sound, muted: !e.target.checked }); }} />Звуки игры</label>
    <label>Громкость · {Math.round(sound.volume * 100)}%<input aria-label="Громкость звуков" type="range" min="0" max="100" value={Math.round(sound.volume * 100)} onChange={e => setSound({ ...sound, volume: Number(e.target.value) / 100 })} /></label>
    <div className="sound-test"><button className="btn btn-ghost btn-sm" disabled={sound.muted} onClick={() => { primeAudio(); setTimeout(() => playSound('tick', sound.volume), 30); }}>Щелчок</button><button className="btn btn-ghost btn-sm" disabled={sound.muted} onClick={() => { primeAudio(); setTimeout(() => playSound('win', sound.volume), 30); }}>Выигрыш</button><button className="btn btn-ghost btn-sm" disabled={sound.muted} onClick={() => { primeAudio(); setTimeout(() => playSound('rare', sound.volume), 30); }}>Редкий</button></div>
  </div></details>;
}
export function useGameAudio(phase: string, rare = false) {
  const { sound } = useStore();
  const currentSound = useRef(sound);
  currentSound.current = sound;
  useEffect(() => {
    if (currentSound.current.muted) return;
    // Let the final "clack" ring first, then the result chime.
    const t = setTimeout(() => {
      if (phase === 'done' || phase === 'win') playSound(rare ? 'rare' : 'win', currentSound.current.volume);
      if (phase === 'lose') playSound('lose', currentSound.current.volume);
    }, 140);
    return () => clearTimeout(t);
    // Only entering a game phase starts its sound; settings never replay a result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
}
