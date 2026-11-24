// Live sky for the hero: drifting volumetric-looking clouds over a misty ridge (Khasi Hills / Shillong Peak mood).
// Raw WebGL (no library) so it costs nothing extra to load. Rendered at reduced resolution and paused when hidden.
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec2 uM; uniform float uWhite;
float h31(vec3 p){p=fract(p*0.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float cloud(vec2 p, float z, float cov){
  float d = fbm(vec3(p, z));
  d += .35*fbm(vec3(p*2.6+d, z*1.3));
  return smoothstep(cov, cov+.42, d);
}
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  float asp = uRes.x/uRes.y;
  vec2 p = vec2(uv.x*asp, uv.y);
  float t = uT;
  // sky: soft blue patches high up, pale near the horizon
  vec3 sky = mix(vec3(.80,.86,.90), vec3(.36,.58,.78), smoothstep(.25,1.,uv.y));
  // high cloud layer (slow, larger) with lit tops and grey undersides
  vec2 m1 = uM*.035;
  vec2 q1 = p*1.25 + vec2(t*.010, t*.002) + m1;
  float c1 = cloud(q1, t*.012, .30);
  float l1 = cloud(q1 + vec2(-.06,.10), t*.012, .30);
  vec3 cc1 = mix(vec3(.74,.78,.82), vec3(1.), clamp(c1-l1*.55+.55,0.,1.));
  vec3 col = mix(sky, cc1, c1*.96);
  // peaks rising through the clouds, bottom right (Shillong Peak ridge, stylised): sharp summits, rocky faces, snow streaks
  float x = uv.x + uM.x*.006;
  float pk1 = .43 - abs(x-.60)*1.25;   // main summit
  float pk2 = .37 - abs(x-.86)*1.05;   // second summit
  float pk3 = .27 - abs(x-.42)*0.9;    // shoulder
  float detail = .085*(fbm(vec3(x*7., 3., 0.))-.5) + .035*(fbm(vec3(x*31., 5., 0.))-.5) + .012*(fbm(vec3(x*95., 8., 0.))-.5);
  float ridge = max(max(pk1, pk2), max(pk3, .16)) + detail;
  float far = .2 + .1*smoothstep(.15,.5,x)*smoothstep(.95,.55,x) + .04*fbm(vec3(x*5., 9., 0.));
  float mFar = smoothstep(far+.003, far-.003, uv.y);
  col = mix(col, mix(vec3(.72,.77,.80), col, .5), mFar);
  float mR = smoothstep(ridge+.002, ridge-.002, uv.y + uM.y*.004);
  // light from the left: faces turning left are lit, right faces in shadow
  float slope = (fbm(vec3(uv.x*26., uv.y*14., 2.))-.5);
  // which summit dominates here, and how far onto its shadowed (right) face we are -- all smooth, no hard columns
  float w1 = smoothstep(-.02, .02, pk1 - pk2);
  float face = mix(smoothstep(-.015, .05, x-.86), smoothstep(-.015, .05, x-.60), w1);
  float gully = fbm(vec3(uv.x*34., uv.y*10., 7.));
  vec3 lit = vec3(.58,.58,.56), shade = vec3(.27,.30,.33);
  vec3 rock = mix(lit, shade, clamp(face*.85 + (gully-.5)*.6, 0., 1.));
  rock *= .85 + .3*fbm(vec3(uv*vec2(70.,30.), 1.));
  // snow sits in streaks near the summits
  float snow = smoothstep(.5,.68, gully + (uv.y-ridge+.09)*3.2) * (1.-face*.55);
  rock = mix(rock, vec3(.95,.96,.97), clamp(snow,0.,1.)*.62);
  rock = mix(rock, vec3(.88,.91,.93), smoothstep(ridge-.14, ridge-.32, uv.y)); // base dissolves into haze
  col = mix(col, rock, mR);
  // low fog layer drifting faster, in front of the ridge foot
  vec2 q2 = p*vec2(1.6,3.2) + vec2(t*.022, 0.) + uM*.06;
  float c2 = cloud(q2, t*.02+4., .34) * smoothstep(.36,.08,uv.y);
  col = mix(col, vec3(.97,.98,.98), c2*.92);
  // near wisps drifting across the whole frame
  float c3 = cloud(p*.8 + vec2(t*.03, t*.004) + uM*.1, t*.01+9., .48);
  col = mix(col, vec3(1.), c3*.55);
  // soft light from upper left
  col += vec3(.06,.05,.03)*smoothstep(.9,.0,length(uv-vec2(.15,1.05)));
  col = mix(col, vec3(.961,.961,.953), uWhite);
  gl_FragColor = vec4(col,1.);
}`;
const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }';

export function createSky(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); } catch (e) { return null; }
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uT = U('uT'), uM = U('uM'), uWhite = U('uWhite');

  const coarse = matchMedia('(pointer: coarse)').matches;
  // Full native resolution on desktop (capped at 1.5x DPR); lowered automatically only if frames run slow
  let scale = coarse ? .6 : Math.min(devicePixelRatio || 1, 1.5);
  const minScale = coarse ? .45 : .6; let slow = 0, lastT = 0;
  const state = { white: 0, mx: 0, my: 0, tx: 0, ty: 0, running: false, active: true, t0: performance.now(), raf: 0 };
  const resize = () => {
    const w = Math.max(2, Math.round(canvas.clientWidth * scale)), h = Math.max(2, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const onMove = (e) => { state.tx = (e.clientX / innerWidth) * 2 - 1; state.ty = (e.clientY / innerHeight) * 2 - 1; };
  addEventListener('pointermove', onMove, { passive: true });
  const frame = (now) => {
    if (!state.running) return;
    state.raf = requestAnimationFrame(frame);
    if (lastT && now) { const dt = now - lastT; slow = dt > 28 ? slow + 1 : Math.max(0, slow - 1); if (slow > 45 && scale > minScale) { scale = Math.max(minScale, scale - .15); slow = 0; resize(); } }
    lastT = now || 0;
    draw();
  };
  const draw = () => {
    state.mx += (state.tx - state.mx) * .04; state.my += (state.ty - state.my) * .04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uT, (performance.now() - state.t0) / 1000 + 40);
    gl.uniform2f(uM, state.mx, -state.my);
    gl.uniform1f(uWhite, state.white);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const toggle = () => {
    const go = state.active && !document.hidden && state.white < .995;
    if (go && !state.running) { state.running = true; frame(); }
    else if (!go && state.running) { state.running = false; cancelAnimationFrame(state.raf); }
  };
  document.addEventListener('visibilitychange', toggle);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); state.active = false; toggle(); canvas.parentElement.classList.remove('has-gl'); });
  canvas.parentElement.classList.add('has-gl');
  toggle();
  return {
    setWhite(v) { state.white = v; toggle(); if (!state.running) draw(); },
    renderOnce() { draw(); },
    destroy() { state.active = false; toggle(); ro.disconnect(); removeEventListener('pointermove', onMove); }
  };
}
