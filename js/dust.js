// Fixed 2D layer: drifting dust motes over the whole page, plus a dotted globe "dome" rising at the bottom of the hero.
export function createDust(canvas) {
  const ctx = canvas.getContext('2d');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
  let W = 0, H = 0;
  const N = coarse ? 220 : 460;
  const motes = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize(); addEventListener('resize', resize);
  for (let i = 0; i < N; i++) motes.push({ x: rnd(0, 1), y: rnd(0, 1), z: rnd(.25, 1), ph: rnd(0, 6.28), s: rnd(1.4, 2.8) });

  // dome: fibonacci sphere points
  const D = coarse ? 520 : 900, dome = [];
  for (let i = 0; i < D; i++) {
    const y = 1 - (i / (D - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996323;
    dome.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }

  const st = { scroll: 0, vel: 0, heroFade: 1, dustAlpha: 0, g: 0, gFade: 1, target: null, running: false, raf: 0, t: 0, last: performance.now() };
  const eio = (x) => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const frame = (now) => {
    if (!st.running) return;
    st.raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - st.last) / 1000); st.last = now; st.t += dt;
    ctx.clearRect(0, 0, W, H);
    // motes
    const a0 = st.dustAlpha;
    const gathering = st.g > .001 && st.target;
    const ge = gathering ? eio(st.g) : 0;
    const gr = st.t * .09, gc = Math.cos(gr), gs = Math.sin(gr), gt = -.25, gct = Math.cos(gt), gst = Math.sin(gt);
    if (a0 > .01 || gathering) {
      ctx.fillStyle = '#003934';
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.y -= dt * (.006 + .012 * m.z) + st.vel * .00002 * m.z;
        m.x += Math.sin(st.t * .3 + m.ph) * dt * .004;
        if (m.y < -.02) m.y += 1.04; if (m.y > 1.02) m.y -= 1.04;
        if (m.x < -.02) m.x += 1.04; if (m.x > 1.02) m.x -= 1.04;
        let px = m.x * W, py = m.y * H, al = a0 * (.32 + .5 * m.z);
        if (gathering) {
          // each mote owns a point on a sphere: dust gathers into the globe
          const [x0, y0, z0] = dome[(i * 7) % dome.length];
          const x = x0 * gc - z0 * gs, z1 = x0 * gs + z0 * gc, y = y0 * gct - z1 * gst, zz = y0 * gst + z1 * gct;
          const T = st.target;
          px += (T.x + x * T.r - px) * ge; py += (T.y - y * T.r - py) * ge;
          al = (al * (1 - ge) + ge * (zz > 0 ? .8 : .22)) * st.gFade;
        }
        if (al < .01) continue;
        ctx.globalAlpha = al;
        { const r = (m.s * m.z + .5) / 2; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill(); }
      }
    }
    // dome
    if (st.heroFade > .01) {
      const R = Math.min(W * .3, H * .55, 520), cx = W * .5, cy = H + R * .42 - st.scroll * .25;
      const rot = st.t * .06, cr = Math.cos(rot), sr = Math.sin(rot), tilt = -.35, ct = Math.cos(tilt), stl = Math.sin(tilt);
      ctx.fillStyle = '#003934';
      for (const [x0, y0, z0] of dome) {
        const x = x0 * cr - z0 * sr, z1 = x0 * sr + z0 * cr;
        const y = y0 * ct - z1 * stl, z = y0 * stl + z1 * ct;
        const px = cx + x * R, py = cy - y * R;
        if (py > H + 2) continue;
        ctx.globalAlpha = st.heroFade * (z > 0 ? .55 : .16) * (.5 + .5 * Math.abs(z));
        const s = z > 0 ? 1.6 : 1.1;
        ctx.fillRect(px, py, s, s);
      }
    }
    ctx.globalAlpha = 1;
  };
  const toggle = (on) => {
    if (on && !st.running) { st.running = true; st.last = performance.now(); st.raf = requestAnimationFrame(frame); }
    else if (!on && st.running) { st.running = false; cancelAnimationFrame(st.raf); }
  };
  document.addEventListener('visibilitychange', () => toggle(!document.hidden));
  toggle(true);
  return {
    gather(g, target, fade) { st.g = g; st.target = target; st.gFade = fade; },
    update(scroll, vel) {
      st.scroll = scroll; st.vel = vel;
      st.heroFade = Math.max(0, 1 - scroll / (innerHeight * .7));
      st.dustAlpha = Math.min(1, Math.max(0, (scroll - innerHeight * .15) / (innerHeight * .45)));
    },
    stop() { toggle(false); ctx.clearRect(0, 0, W, H); }
  };
}
