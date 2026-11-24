// Generated ambience (no audio files): soft wind (filtered noise) + a slow, quiet pad.
let ctx = null, master = null, on = false;
function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  // wind
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .032; b2 = .95 * b2 + w * .048; d[i] = (b0 + b1 + b2) * .35; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .6;
  const wg = ctx.createGain(); wg.gain.value = .5;
  const lfo = ctx.createOscillator(); lfo.frequency.value = .07; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency);
  src.connect(lp); lp.connect(wg); wg.connect(master); src.start(); lfo.start();
  // pad: A2, E3, C#4, G#4 sines with slow tremolo
  [110, 164.81, 277.18, 415.3].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = .022 / (i + 1);
    const t = ctx.createOscillator(); t.frequency.value = .05 + i * .03; const tg = ctx.createGain(); tg.gain.value = .012 / (i + 1);
    t.connect(tg); tg.connect(g.gain); o.connect(g); g.connect(master); o.start(); t.start();
  });
}
export function toggleSound(force) {
  const want = typeof force === 'boolean' ? force : !on;
  if (want && !ctx) build();
  if (!ctx) return false;
  if (ctx.state === 'suspended') ctx.resume();
  on = want;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? .55 : 0, ctx.currentTime, on ? .8 : .25);
  return on;
}
export const soundOn = () => on;
