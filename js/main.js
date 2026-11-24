/* global gsap, ScrollTrigger, Lenis */
import { toggleSound, soundOn } from './sound.js';

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const touch = matchMedia('(pointer: coarse)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const narrow = () => innerWidth <= 768;
const libs = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined' && typeof window.Lenis !== 'undefined';
// Max motion by default; only the visitor's own switch turns it off.
const reduce = root.classList.contains('reduced') || !libs;
if (!libs) root.classList.add('reduced');
const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ---------------- Always-on behaviour ---------------- */
// Sound: every [data-sound] control toggles the generated ambience
const soundUI = () => {
  const on = soundOn();
  document.body.classList.toggle('is-sound', on);
  $$('[data-sound]').forEach((b) => { b.setAttribute('aria-pressed', String(on)); const t = $('.sound-pill__t, .amb__t', b); if (t) t.textContent = b.classList.contains('amb') ? (on ? 'Ambient sound on' : 'Ambient sound off') : (on ? 'Sound On' : 'Enable Sound'); });
};
$$('[data-sound]').forEach((b) => b.addEventListener('click', () => { toggleSound(); store.set('sound', soundOn() ? 'on' : 'off'); soundUI(); }));

// Videos play only while visible
const vio = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target; if (e.isIntersecting && !reduce) v.play().catch(() => {}); else v.pause(); }), { threshold: .15 });
$$('video').forEach((v) => vio.observe(v));

// Menu
(function menu() {
  const btn = $('.hdr__burger'), m = $('#menu');
  const close = () => { btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Open menu'); m.hidden = true; window.__lenis && window.__lenis.start(); };
  btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-expanded') === 'true') return close();
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Close menu'); m.hidden = false; window.__lenis && window.__lenis.stop();
    if (!reduce) { gsap.fromTo(m, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'expo.out' }); gsap.from($$('nav a', m), { y: 40, opacity: 0, duration: .9, stagger: .07, ease: 'expo.out', delay: .1 }); }
    $('nav a', m).focus();
  });
  $$('a', m).forEach((a) => a.addEventListener('click', close));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.hidden) { close(); btn.focus(); } });
})();

// Form (demo)
(function form() {
  const f = $('.formcard'), err = $('.formcard__err', f), btn = $('.btn-dark', f), label = $('.btn-dark__t', f);
  const checks = { first: (v) => v.trim().length > 1, last: (v) => v.trim().length > 1, email: (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), phone: (v) => v.replace(/\D/g, '').length >= 10 };
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    let bad = null;
    const msgs = { first: 'Please enter your first name.', last: 'Please enter your last name.', email: 'Enter a valid email address.', phone: 'Enter a phone number with at least 10 digits.' };
    Object.entries(checks).forEach(([n, fn]) => { const i = f.elements[n]; const ok = fn(i.value); i.closest('.fld').dataset.err = msgs[n]; i.closest('.fld').classList.toggle('is-err', !ok); i.setAttribute('aria-invalid', String(!ok)); if (!ok && !bad) bad = i; });
    if (bad) { err.textContent = 'Please check the highlighted fields.'; bad.focus(); return; }
    err.textContent = ''; btn.disabled = true; label.textContent = 'Sending…';
    setTimeout(() => { f.classList.add('is-done'); label.textContent = 'Request received'; err.textContent = `Thank you, ${f.elements.first.value.trim()}. This is a demo, so nothing was sent.`; setTimeout(() => { btn.disabled = false; label.textContent = 'Begin your journey'; f.reset(); f.classList.remove('is-done'); }, 5000); }, 1100);
  });
  $$('input', f).forEach((i) => i.addEventListener('input', () => i.closest('.fld').classList.remove('is-err')));
})();

// Motion switch + storage notice
(function prefs() {
  const mt = $('.motion-toggle'); const off = root.classList.contains('reduced') && libs;
  mt.textContent = off ? 'Motion: Off' : 'Motion: On'; mt.setAttribute('aria-pressed', String(!off));
  mt.addEventListener('click', () => { store.set('motion', off ? 'on' : 'off'); location.reload(); });
  const c = $('.consent');
  if (!store.get('consent')) setTimeout(() => { c.hidden = false; if (!reduce) gsap.from(c, { y: 30, opacity: 0, duration: .8, ease: 'expo.out' }); }, 2600);
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-consent]'); if (!b) return;
    if (b.dataset.consent === 'prefs') { const p = $('.consent__prefs', c); p.hidden = !p.hidden; $('[data-pref="motion"]', c).checked = !root.classList.contains('reduced'); $('[data-pref="sound"]', c).checked = soundOn(); return; }
    const mo = $('[data-pref="motion"]', c), so = $('[data-pref="sound"]', c);
    store.set('consent', '1'); c.hidden = true;
    if (!$('.consent__prefs', c).hidden) {
      if (so.checked !== soundOn()) { toggleSound(so.checked); soundUI(); }
      if (mo.checked === root.classList.contains('reduced')) { store.set('motion', mo.checked ? 'on' : 'off'); location.reload(); }
    }
  });
})();

/* ---------------- Visual layers ---------------- */
let sky = null, dust = null, globe = null;
const skyCanvas = $('.sky__c');
const ready = Promise.all([
  reduce ? null : import('./sky.js').then((m) => { try { sky = m.createSky(skyCanvas); } catch (e) {} }).catch(() => {}),
  reduce ? null : import('./dust.js').then((m) => { dust = m.createDust($('.dust')); }).catch(() => {}),
  import('./globe.js').then((m) => { try { globe = m.createGlobe($('.globe')); } catch (e) {} }).catch(() => {})
]);

if (reduce) {
  // Calm mode: final states, globe settled on Shillong.
  ready.then(() => { if (globe) { globe.setProgress(1); globe.renderOnce(); } });
  $$('.towns li').forEach((li) => li.classList.add('on'));
  $('.hint').classList.add('is-off');
} else {
  ready.then(initMotion);
}

function initMotion() {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  // Lenis: smooth wheel on desktop, native touch on phones
  const lenis = new Lenis({ lerp: .1, smoothWheel: true, syncTouch: false });
  window.__lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const id = a.getAttribute('href'); const t = id.length > 1 && $(id); if (!t) return; e.preventDefault(); lenis.scrollTo(id === '#book' && !narrow() ? $('.region').offsetTop + $('.region').offsetHeight - innerHeight : t, { duration: 1.6 }); }));

  /* Scroll-linked layers */
  const hdr = $('.hdr'), hint = $('.hint'); let lastY = 0;
  lenis.on('scroll', ({ scroll, velocity }) => {
    const vh = innerHeight;
    sky && sky.setWhite(Math.min(1, Math.max(0, scroll / (vh * .9))));
    dust && dust.update(scroll, velocity);
    hint.classList.toggle('is-off', scroll > 80);
    hdr.classList.toggle('is-past', scroll > vh * .6);
    hdr.classList.toggle('is-hidden', scroll > lastY && scroll > vh && $('#menu').hidden);
    lastY = scroll;
  });
  dust && dust.update(0, 0);

  /* Hero intro */
  const word = $('.hero__word');
  const chars = splitChars(word);
  const tl = gsap.timeline({ delay: .2 });
  tl.from('.hero__block .mark', { opacity: 0, y: 14, scale: .9, duration: 1.15, ease: 'expo.out' })
    .from(chars, { opacity: 0, y: 18, filter: 'blur(6px)', duration: 1.15, stagger: .045, ease: 'expo.out' }, '-=.8')
    .from(['.hero__sub', '.hero__tag'], { opacity: 0, y: 10, duration: .9, stagger: .12, ease: 'expo.out' }, '-=.7')
    .from('.hero__explore', { opacity: 0, y: 10, duration: .9, ease: 'expo.out' }, '-=.6')
    .from('.hdr__nav > *', { opacity: 0, y: -10, duration: .8, stagger: .06, ease: 'expo.out' }, '-=.9')
    .from(['.hint', '.dock > *'], { opacity: 0, y: 12, duration: .8, stagger: .08, ease: 'expo.out' }, '-=.7');
  // hero block drifts up and fades as the sky whites out
  gsap.to('.hero__block', { yPercent: -35, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '80% top', scrub: true } });

  /* Video cards: open from a smaller inset, inner video settles */
  $$('[data-reveal-card]').forEach((card) => {
    const v = $('video', card);
    gsap.fromTo(card, { clipPath: 'inset(9% 9% 9% 9% round 3px)' }, { clipPath: 'inset(0% 0% 0% 0% round 3px)', ease: 'none', scrollTrigger: { trigger: card, start: 'top 95%', end: 'top 35%', scrub: .6 } });
    gsap.fromTo(v, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.from('.intro .glass-cta', { opacity: 0, y: 30, duration: 1.15, ease: 'expo.out', scrollTrigger: { trigger: '.intro .glass-cta', start: 'top 92%' } });

  /* Headings: words rise in */
  $$('[data-words]').forEach((h) => {
    const words = splitWords(h);
    if (h.classList.contains('approach__h')) {
      gsap.fromTo(words, { opacity: .12 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: h, start: 'top 80%', end: 'bottom 45%', scrub: .5 } });
    } else {
      gsap.from(words, { yPercent: 70, opacity: 0, duration: 1.15, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
    }
  });
  gsap.from('.label', { opacity: 0, letterSpacing: '0.6em', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.label', start: 'top 90%' } });
  $$('.treat').forEach((t) => {
    gsap.from($$('.treat__n, .treat__p, .treat__ctas, .treat .cta', t).filter((e) => e.closest('.treat') === t), { opacity: 0, y: 24, duration: 1.15, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 75%' } });
  });

  /* Region: globe turns to Shillong, towns light up, form arrives */
  const items = $$('.towns li');
  const mm = gsap.matchMedia();
  const globeEl = $('.globe'), pinEl = $('.region__pin');
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  // Dust -> dotted sphere -> line globe (the reference's signature move)
  const morph = { g: 0, rp: 0 };
  const applyMorph = () => {
    const T = globe && globe.screenSphere();
    dust && dust.gather(morph.g, T, 1 - clamp01((morph.g - .92) / .08) * clamp01(morph.rp / .1 + .35));
    globeEl.style.opacity = clamp01((morph.g - .72) / .28).toFixed(3);
  };
  // Town list curves along the globe's left edge (desktop)
  let townW = [];
  const layoutTowns = () => {
    const T = globe && globe.screenSphere(); if (!T) return;
    const pr = pinEl.getBoundingClientRect(), cy = T.y - pr.top, cx = T.x - pr.left, R = T.r * 1.03, rowH = Math.min(34, (R * 1.5) / items.length);
    if (!townW.length) townW = items.map((li) => li.offsetWidth);
    items.forEach((li, i) => {
      const y = cy + (i - (items.length - 1) / 2) * rowH, dy = y - cy;
      const x = cx - Math.sqrt(Math.max(0, R * R - dy * dy)) - 22 - townW[i];
      li.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - 10)}px)`;
    });
  };
  mm.add('(min-width: 769px)', () => {
    if (touch) return;
    root.classList.add('curved-towns');
    globe && globe.setOffset(.12);
    ScrollTrigger.create({ trigger: '.region', start: 'top bottom', end: 'top top', scrub: true, onUpdate: (s) => { morph.g = s.progress; applyMorph(); } });
    ScrollTrigger.create({
      trigger: '.region', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (s) => {
        morph.rp = s.progress; applyMorph();
        globe && globe.setProgress(s.progress);
        const lit = Math.floor(Math.max(0, (s.progress - .4) / .4) * items.length);
        items.forEach((li, i) => li.classList.toggle('on', i < lit));
        layoutTowns();
      }
    });
    addEventListener('resize', () => { townW = []; layoutTowns(); });
    gsap.fromTo('.region__head', { opacity: 0, y: 30 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.region', start: 'top 70%', end: 'top top', scrub: true } });
    gsap.fromTo('.towns li', { opacity: 0 }, { opacity: 1, stagger: .04, ease: 'none', scrollTrigger: { trigger: '.region', start: 'top 10%', end: '20% top', scrub: true, onEnter: layoutTowns } });
    return () => { root.classList.remove('curved-towns'); items.forEach((li) => (li.style.transform = '')); };
    gsap.fromTo('.formcard', { opacity: 0, xPercent: -14 }, { opacity: 1, xPercent: 0, ease: 'none', immediateRender: true, scrollTrigger: { trigger: '.region', start: '84% bottom', end: '97% bottom', scrub: true } });
    // heading steps aside as the form arrives in the same place
    gsap.to('.region__head', { opacity: 0, y: 30, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.region', start: '78% bottom', end: '86% bottom', scrub: true } });
  });
  mm.add('(max-width: 768px)', () => {
    globe && globe.setSpin(true); globe && globe.setOffset(0);
    ScrollTrigger.create({ trigger: '.globe', start: 'top bottom', end: 'center 55%', scrub: true, onUpdate: (s) => { morph.g = s.progress; applyMorph(); } });
    ScrollTrigger.create({ trigger: '.globe', start: 'center 55%', end: 'bottom 30%', scrub: true, onUpdate: (s) => { morph.rp = s.progress; applyMorph(); globe && globe.setProgress(.35 + s.progress * .65); } });
    items.forEach((li) => li.classList.add('on'));
    gsap.from('.formcard', { opacity: 0, y: 40, duration: 1.15, ease: 'expo.out', scrollTrigger: { trigger: '.formcard', start: 'top 88%' } });
  });
  // touch devices wider than 768 (tablets): no sticky dependence on scrub smoothing, globe auto-spins
  if (touch && !narrow()) { globe && globe.setSpin(true); globe && globe.setProgress(1); globeEl.style.opacity = 1; items.forEach((li) => li.classList.add('on')); }

  gsap.from('.foot > *', { opacity: 0, y: 20, duration: 1.15, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 85%' } });

  /* Cursor + magnetic (fine pointers only) */
  if (fine) {
    const cur = document.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true'); document.body.appendChild(cur);
    const x = gsap.quickTo(cur, 'x', { duration: .45, ease: 'power3' }), y = gsap.quickTo(cur, 'y', { duration: .45, ease: 'power3' });
    addEventListener('pointermove', (e) => { x(e.clientX); y(e.clientY); }, { passive: true });
    $$('a, button, .vcard, input').forEach((el) => { el.addEventListener('pointerenter', () => cur.classList.add('is-big')); el.addEventListener('pointerleave', () => cur.classList.remove('is-big')); });
    $$('[data-magnetic]').forEach((b) => {
      const mx = gsap.quickTo(b, 'x', { duration: .7, ease: 'elastic.out(1,.45)' }), my = gsap.quickTo(b, 'y', { duration: .7, ease: 'elastic.out(1,.45)' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .25); my((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
  // Failsafe: hero content is never left hidden
  setTimeout(() => { if (tl.progress() < 1) tl.progress(1); }, 6000);
}

/* ---------------- Text helpers (accessible) ---------------- */
function splitWords(el) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  const out = [];
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span'); s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = part; frag.appendChild(s); out.push(s);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) { n.setAttribute('aria-hidden', 'true'); walk(n); }
  });
  walk(el);
  return out;
}
function splitChars(el) {
  const text = el.textContent; el.setAttribute('aria-label', text); el.textContent = '';
  return [...text].map((ch) => { const s = document.createElement('span'); s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch === ' ' ? ' ' : ch; el.appendChild(s); return s; });
}
