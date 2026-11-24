// Line-art globe that turns to North-East India and draws arcs from nearby towns into Shillong.
// Borders: Natural Earth (public domain) via world-atlas; drawn into an equirectangular canvas texture.
import * as THREE from 'three';

const SHILLONG = [25.5788, 91.8933];
export const TOWNS = [
  ['Nongpoh', 25.90, 91.88], ['Jowai', 25.45, 92.20], ['Nongstoin', 25.52, 91.27], ['Guwahati', 26.14, 91.74],
  ['Williamnagar', 25.50, 90.61], ['Silchar', 24.83, 92.78], ['Tura', 25.51, 90.22], ['Itanagar', 27.08, 93.61],
  ['Kohima', 25.67, 94.11], ['Aizawl', 23.73, 92.72], ['Imphal', 24.82, 93.94], ['Agartala', 23.83, 91.28]
];
const ll2v = (lat, lon, r = 1) => {
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
};

async function buildTexture(size) {
  const W = size, H = size / 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const world = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(r => r.json());
  const topo = window.topojson;
  const X = (lon) => (lon + 180) / 360 * W, Y = (lat) => (90 - lat) / 180 * H;
  const trace = (ring) => {
    let px = null;
    ring.forEach(([lon, lat], i) => {
      const x = X(lon), y = Y(lat);
      if (i === 0 || (px !== null && Math.abs(x - px) > W / 2)) g.moveTo(x, y); else g.lineTo(x, y);
      px = x;
    });
  };
  // India filled (the clinic's country), with the North East glowing
  const countries = topo.feature(world, world.objects.countries).features;
  const india = countries.find(f => f.id === '356');
  if (india) {
    // silhouette icon for the section heading (equirectangular, fitted to 100x100)
    try {
      const polys0 = india.geometry.type === 'Polygon' ? [india.geometry.coordinates] : india.geometry.coordinates;
      let mnx = 999, mny = 999, mxx = -999, mxy = -999;
      polys0.forEach(p => p[0].forEach(([lo, la]) => { mnx = Math.min(mnx, lo); mxx = Math.max(mxx, lo); mny = Math.min(mny, la); mxy = Math.max(mxy, la); }));
      const s = 92 / Math.max(mxx - mnx, mxy - mny), ox = (100 - (mxx - mnx) * s) / 2, oy = (100 - (mxy - mny) * s) / 2;
      const P = (lo, la) => [(ox + (lo - mnx) * s).toFixed(1), (oy + (mxy - la) * s).toFixed(1)];
      const d = polys0.filter(p => p[0].length > 12).map(p => 'M' + p[0].map(([lo, la]) => P(lo, la).join(' ')).join('L') + 'Z').join('');
      const svg = document.querySelector('.region__icon');
      if (svg) { svg.querySelector('path').setAttribute('d', d); const [cx, cy] = P(SHILLONG[1], SHILLONG[0]); const c = svg.querySelector('circle'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); svg.classList.add('is-ready'); }
    } catch (e) {}
    g.beginPath();
    const polys = india.geometry.type === 'Polygon' ? [india.geometry.coordinates] : india.geometry.coordinates;
    polys.forEach(poly => poly.forEach(r => { trace(r); g.closePath(); }));
    g.fillStyle = 'rgba(47,107,99,.96)'; g.fill('evenodd');
  }
  const ne = g.createRadialGradient(X(SHILLONG[1]), Y(SHILLONG[0]), 0, X(SHILLONG[1]), Y(SHILLONG[0]), W * .0045);
  ne.addColorStop(0, 'rgba(77,182,172,.9)'); ne.addColorStop(1, 'rgba(77,182,172,0)');
  g.fillStyle = ne; g.fillRect(0, 0, W, H);
  // borders + coastlines
  const lines = (mesh, width, color) => { g.beginPath(); mesh.coordinates.forEach(trace); g.lineWidth = width; g.strokeStyle = color; g.stroke(); };
  lines(topo.mesh(world, world.objects.countries, (a, b) => a !== b), W / 4096 * 1.6, 'rgba(0,57,52,.55)');
  lines(topo.mesh(world, world.objects.countries, (a, b) => a === b), W / 4096 * 2.4, 'rgba(0,57,52,.85)');
  // graticule
  g.beginPath();
  for (let lon = -180; lon <= 180; lon += 15) { g.moveTo(X(lon), 0); g.lineTo(X(lon), H); }
  for (let lat = -75; lat <= 75; lat += 15) { g.moveTo(0, Y(lat)); g.lineTo(W, Y(lat)); }
  g.lineWidth = W / 4096; g.strokeStyle = 'rgba(0,57,52,.10)'; g.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export function createGlobe(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return null; }
  const coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
  camera.position.set(0, 0, 3.9);
  const world = new THREE.Group(); scene.add(world);

  const sphereGeo = new THREE.SphereGeometry(1, 128, 96);
  const front = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide });
  const back = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, opacity: .22 });
  world.add(new THREE.Mesh(sphereGeo, back), new THREE.Mesh(sphereGeo, front));
  const haze = new THREE.Mesh(new THREE.SphereGeometry(.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0xf2f1ef, transparent: true, opacity: .35, depthWrite: false }));
  world.add(haze);
  buildTexture(coarse ? 2048 : 4096).then((tex) => { front.map = tex; back.map = tex; front.needsUpdate = back.needsUpdate = true; draw(); }).catch(() => {});

  // arcs + markers
  const end = ll2v(SHILLONG[0], SHILLONG[1], 1.001);
  const arcMat = new THREE.LineBasicMaterial({ color: 0x1a9e8f, transparent: true, opacity: .95 });
  const arcs = TOWNS.map(([, lat, lon]) => {
    const start = ll2v(lat, lon, 1.001);
    const d = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(.5).normalize().multiplyScalar(1.001 + d * .55);
    const pts = new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(48);
    const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.setDrawRange(0, 0);
    const line = new THREE.Line(geo, arcMat); world.add(line);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.006, 12, 8), new THREE.MeshBasicMaterial({ color: 0x003934 }));
    dot.position.copy(start); world.add(dot);
    return { geo };
  });
  const home = new THREE.Mesh(new THREE.SphereGeometry(.009, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe2482f }));
  home.position.copy(end); world.add(home);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.012, .015, 40), new THREE.MeshBasicMaterial({ color: 0xe2482f, transparent: true, side: THREE.DoubleSide }));
  ring.position.copy(end.clone().multiplyScalar(1.0005)); ring.lookAt(end.clone().multiplyScalar(2)); world.add(ring);

  const S = { p: 0, auto: 0, active: false, raf: 0, running: false, offset: .12, z: 3.9 };
  const TAN = Math.tan(16 * Math.PI / 180);
  const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const target = (lat, lon) => ({ ry: -Math.PI / 2 - lon * Math.PI / 180, rx: lat * Math.PI / 180 });
  const A = target(18, 15), B = target(SHILLONG[0] - 1.2, SHILLONG[1]);

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const k = ease(Math.min(1, S.p / .55));
    const turn = A.ry + (B.ry - A.ry) * k + S.auto;
    world.rotation.set(A.rx + (B.rx - A.rx) * k, turn, 0);
    const z = 3.9 - .3 * ease(Math.min(1, Math.max(0, (S.p - .3) / .45)));
    camera.position.z = z; S.z = z;
    // keep the whole hemisphere in frame, placed right of centre on desktop
    world.position.x = S.offset * 2 * z * TAN * camera.aspect;
    const arcK = Math.min(1, Math.max(0, (S.p - .45) / .4));
    arcs.forEach((a, i) => { const local = Math.min(1, Math.max(0, arcK * 1.6 - i / TOWNS.length * .6)); a.geo.setDrawRange(0, Math.floor(local * 49)); });
    const tt = performance.now() / 1000;
    const pulse = (tt % 2.4) / 2.4;
    ring.scale.setScalar(1 + pulse * 2.2); ring.material.opacity = (1 - pulse) * .9 * Math.min(1, S.p * 3);
    renderer.render(scene, camera);
  }
  const loop = () => { if (!S.running) return; S.raf = requestAnimationFrame(loop); if (S.spin) S.auto += .0012; draw(); };
  const io = new IntersectionObserver(([e]) => { S.active = e.isIntersecting; toggle(); }, { rootMargin: '200px' });
  io.observe(canvas);
  const toggle = () => { const go = S.active && !document.hidden; if (go && !S.running) { S.running = true; loop(); } else if (!go && S.running) { S.running = false; cancelAnimationFrame(S.raf); } };
  document.addEventListener('visibilitychange', toggle);
  return {
    setProgress(p) { S.p = p; },
    setSpin(on) { S.spin = on; },
    setOffset(o) { S.offset = o; },
    // on-screen centre/radius of the sphere (CSS px, viewport coords) - used by the dust layer to gather into it
    screenSphere() {
      const r = canvas.getBoundingClientRect(); if (!r.height) return null;
      const z = 3.9 - .3 * ease(Math.min(1, Math.max(0, (S.p - .3) / .45)));
      return { x: r.left + r.width / 2 + S.offset * r.width, y: r.top + r.height / 2, r: r.height / (2 * z * TAN), rot: world.rotation.y };
    },
    renderOnce: draw
  };
}
