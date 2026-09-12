// Web Audio engine for Your Drop.
// Ticks are pre-scheduled on the AudioContext clock from the same easing curve that
// drives the CSS transition, so every click lands exactly when a card (or a scale mark)
// crosses the pointer — no requestAnimationFrame jitter and no machine-gun bursts.

let context: AudioContext | undefined;
let master: GainNode | undefined;
let muted = false;
let clickBuffer: AudioBuffer | undefined;
let stopBuffer: AudioBuffer | undefined;
let reverb: ConvolverNode | undefined;

export function setAudioMuted(value: boolean) { muted = value; if (master && context) master.gain.setTargetAtTime(value ? 0 : 1, context.currentTime, .01); }
export function primeAudio() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain(); master.gain.value = muted ? 0 : 1;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 6; limiter.attack.value = .003; limiter.release.value = .12;
      master.connect(limiter); limiter.connect(context.destination);
    }
    void context.resume().catch(() => {});
  } catch {}
}

// ---------- samples ----------
function noise(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0xffffffff * 2 - 1; }; }

// A short, rounded "wooden" detent: low-passed noise burst + a damped body.
function makeClick(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .032), ctx.sampleRate);
  const data = buffer.getChannelData(0), rnd = noise(2026);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    lp += .22 * (rnd() - lp); lp2 += .22 * (lp - lp2);
    const body = Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t * 320) * .5 + Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t * 180) * .35;
    data[i] = (lp2 * 1.6 * Math.exp(-t * 260) + body) * Math.min(1, t / .0008);
  }
  return buffer;
}
// Heavier "clack" for the final stop.
function makeStop(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .09), ctx.sampleRate);
  const data = buffer.getChannelData(0), rnd = noise(817);
  let lp = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    lp += .3 * (rnd() - lp);
    data[i] = (lp * 1.2 * Math.exp(-t * 90) + Math.sin(2 * Math.PI * 240 * t) * Math.exp(-t * 60) * .7 + Math.sin(2 * Math.PI * 720 * t) * Math.exp(-t * 140) * .3) * Math.min(1, t / .001);
  }
  return buffer;
}
// Tiny synthetic room so chimes do not sound dry.
function makeReverb(ctx: AudioContext) {
  const seconds = 1.4, buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const data = buffer.getChannelData(ch), rnd = noise(99 + ch); for (let i = 0; i < data.length; i++) { const t = i / ctx.sampleRate; data[i] = rnd() * Math.exp(-t * 3.2) * .5; } }
  const node = ctx.createConvolver(); node.buffer = buffer; return node;
}
function room(ctx: AudioContext) {
  if (!reverb) { reverb = makeReverb(ctx); const wet = ctx.createGain(); wet.gain.value = .22; reverb.connect(wet); wet.connect(master!); }
  return reverb;
}

function playBuffer(buffer: AudioBuffer, at: number, gain: number, rate = 1) {
  if (!context || !master) return null;
  const source = context.createBufferSource(), g = context.createGain();
  source.buffer = buffer; source.playbackRate.value = rate; g.gain.value = gain;
  source.connect(g); g.connect(master); source.start(at);
  source.onended = () => { source.disconnect(); g.disconnect(); };
  return source;
}

// ---------- result sounds ----------
function tone(frequency: number, at: number, duration: number, volume: number, type: OscillatorType = 'sine', detune = 0) {
  if (!context || !master) return;
  const osc = context.createOscillator(), g = context.createGain();
  osc.type = type; osc.frequency.value = frequency; osc.detune.value = detune;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(volume, at + .012); g.gain.exponentialRampToValueAtTime(.0008, at + duration);
  osc.connect(g); g.connect(master); g.connect(room(context));
  osc.start(at); osc.stop(at + duration + .05);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}

export function playSound(kind: 'tick' | 'stop' | 'win' | 'rare' | 'lose', volume: number) {
  if (!context || !master || muted || context.state !== 'running' || volume <= 0) return;
  const now = context.currentTime + .01;
  if (kind === 'tick') { playBuffer(clickBuffer ??= makeClick(context), now, volume * .5); return; }
  if (kind === 'stop') { playBuffer(stopBuffer ??= makeStop(context), now, volume * .7); return; }
  if (kind === 'lose') {
    // Soft two-note sigh: no buzzer, no punishment.
    tone(261.6, now, .55, volume * .12, 'triangle'); tone(196, now + .22, .8, volume * .11, 'triangle');
    return;
  }
  // Win: a warm major triad played as a quick roll; rare adds a sparkling octave run.
  const roll = kind === 'rare' ? [523.3, 659.3, 784, 1046.5, 1318.5, 1568] : [523.3, 659.3, 784];
  roll.forEach((f, i) => { const at = now + i * (kind === 'rare' ? .075 : .085); tone(f, at, .9, volume * .11, 'sine'); tone(f, at, .5, volume * .04, 'triangle', 6); });
  if (kind === 'rare') for (let i = 0; i < 6; i++) tone(2093 * (1 + (i % 2) * .5), now + .45 + i * .09, .35, volume * .025, 'sine');
}

// ---------- easing-synced ticks ----------
// Same maths browsers use for cubic-bezier(): solve x(t)=progress, return y(t).
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solveT = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) { const dx = sampleX(t) - x; if (Math.abs(dx) < 1e-6) return t; const d = sampleDX(t); if (Math.abs(d) < 1e-6) break; t -= dx / d; }
    let lo = 0, hi = 1; t = x;
    while (lo < hi) { const xt = sampleX(t); if (Math.abs(xt - x) < 1e-6) return t; if (x > xt) lo = t; else hi = t; t = (lo + hi) / 2; if (hi - lo < 1e-7) break; }
    return t;
  };
  const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveT(x)));
  // Inverse: for a given eased value y, find the time fraction x. y is monotonic here.
  const inverse = (y: number) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (ease(mid) < y) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  return { ease, inverse };
}

export type TickPlan = {
  /** Total travel in the animated unit (px or degrees). */
  distance: number;
  /** Positions (0..distance) where a detent passes the pointer, ascending. */
  marks: number[];
  /** CSS transition duration in ms. */
  duration: number;
  /** cubic-bezier control points of the transition. */
  bezier: [number, number, number, number];
  /** Master volume 0..1. */
  volume: number;
  /** Play the heavier "stop" sound when the motion ends. */
  stop?: boolean;
};

/**
 * Schedule every detent click for a CSS transform transition. Call it in the same frame
 * where the transition starts. Returns a canceller (use on unmount / transition cancel).
 */
export function scheduleTicks(plan: TickPlan) {
  if (!context || !master || muted || context.state !== 'running' || plan.volume <= 0 || plan.distance <= 0) return () => {};
  const ctx = context, start = ctx.currentTime + .02;
  const { inverse } = cubicBezier(...plan.bezier);
  const sources: AudioBufferSourceNode[] = [];
  const click = clickBuffer ??= makeClick(ctx);
  let last = -Infinity;
  for (const mark of plan.marks) {
    if (mark <= 0 || mark >= plan.distance) continue;
    const at = start + inverse(mark / plan.distance) * plan.duration / 1000;
    // Fast phase: never more than ~20 clicks per second — a quick ratchet, not a burst.
    if (at - last < .05) continue;
    const gap = at - last;
    const speed = Math.min(1, .12 / Math.max(gap, .01));
    const gain = plan.volume * (.5 - speed * .2);
    const rate = 1 + speed * .1 + Math.sin(mark * 12.9898) * .02;
    const s = playBuffer(click, at, gain, rate); if (s) sources.push(s);
    last = at;
  }
  if (plan.stop) { const s = playBuffer(stopBuffer ??= makeStop(ctx), start + plan.duration / 1000 + .01, plan.volume * .65); if (s) sources.push(s); }
  return () => { for (const s of sources) { try { s.stop(); } catch {} } };
}
