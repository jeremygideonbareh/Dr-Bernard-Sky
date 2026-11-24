# Dr. Bernard T. Lyngdoh, Neuro & Spine (concept demo)

A pitch demo for Dr. Bernard T. Lyngdoh Ryntathiang's Neuro & Spine Clinic, Demthring, Shillong. It is built to the same *build calibre* as skyclinics.al: layout system, section rhythm, motion, interactions and measured design tokens. Everything you see is the clinic's own or newly made. No SkyClinics name, logo, copy, footage, icons or code is used.

## Run
Static site, no build step:

```bash
npx http-server . -p 5180 -c-1
```

Then open http://localhost:5180. It's also published on GitHub Pages from `main`.

## Stack
- GSAP 3.13 + ScrollTrigger for choreography; Lenis 1.1.20 for smooth wheel scrolling (native touch on phones)
- Three.js 0.160 for the globe; raw WebGL for the sky; Canvas 2D for the dust layer and dotted dome
- topojson-client + world-atlas (Natural Earth, public domain) for borders
- Satoshi (Fontshare, open licence)
- Web Audio for the generated ambient sound (no audio files)

## Substitutions (reference → this build)
| Reference element | Replacement | How it was made |
|---|---|---|
| SkyClinics wordmark + triangle mark | **B.T. LYNGDOH** wordmark + three stacked rounded bars (vertebrae), the last in signboard red | Drawn as SVG by hand |
| WebGL sky over Albanian peaks | Live WebGL clouds over a stylised Shillong-Peak ridge | `js/sky.js` fragment shader (fbm clouds, ridged summits, fog) |
| Drone footage of the clinic | Aerial drift over misty pine ridges | WebGL render → H.264 (`sky/render`) |
| Implantology footage | Rotating spinal column in clinical light | Three.js procedural vertebrae → H.264 |
| Full-arch footage | MRI-style scan sweep over a rendered brain slice | Fragment shader → H.264 |
| Smile-design footage | Nerve fibres carrying signal pulses | Fragment shader → H.264 |
| Lab footage | Light through window blinds with drifting dust | Fragment shader → H.264 |
| Globe: 22 countries, flight times to Albania | Globe turning to North-East India; 12 towns, approximate road times to Shillong | Three.js + Natural Earth borders drawn to a canvas texture; arcs as quadratic Béziers |
| Albania silhouette | India silhouette with a Shillong pin | Generated at runtime from the same Natural Earth data |
| Music toggle | Ambient wind + soft pad | Web Audio, off until the visitor turns it on |
| Cookie banner | Storage notice (only motion/sound choices are kept; no cookies, no tracking) | n/a |
| Copy | Written for the clinic from public facts (see `../../clinic-research.md`) | n/a |

All videos are 6-second, seamless loops: every motion is periodic in the loop time. Each was rendered at 30 fps by `sky/render/render.mjs` (headless Chromium + WebGL → JPEG frames → FFmpeg `libx264`, CRF 24, `+faststart`), with posters taken from frame 0. Blender wasn't available on this machine (its MCP add-on was outdated and not running), so WebGL was used as the render engine.

## To confirm with the clinic
- WhatsApp number and phone (shown as "to be confirmed")
- Road times (approximate)
- Opening hours (from Google Maps)
- Procedure list (from a public directory listing)
- Real photos and video of the clinic, if they want to replace the renders

## Verification
- **Style gate** (`assert-styles.mjs` from the clone methodology, computed styles vs tokens measured on the reference): **40/40 passed, 0 failed**. Artifacts are in `../workspace/06-qa/cycle-1/`.
- Side-by-side stills against the reference at matched scroll points: `../workspace/06-qa/side2/side-by-side.jpg`.
- Review rounds: see the project log.

## Motion and accessibility
Full motion plays by default. The footer **Motion** switch (and the storage notice's Preferences) turns it off and is remembered per browser. Split headings keep an accessible label. Videos are muted, have labels, and play only while on screen. The demo form validates fields, shows a loading state, and says plainly that nothing is sent.
