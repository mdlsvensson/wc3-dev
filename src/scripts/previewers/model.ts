import MdlxModelModule from 'mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js';
import BlpHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/blp/handler.js';
import DdsHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/dds/handler.js';
import MdxHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/handler.js';
import TgaHandlerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/handlers/tga/handler.js';
import ModelViewerModule from 'mdx-m3-viewer-th/dist/cjs/viewer/viewer.js';
import type { GameTextureMap } from '../../lib/game-textures.ts';
import { cjsDefault, isHandler } from './cjs.ts';
import type { PreviewFile } from './files.ts';
import { defaultSequence, isHdModel, SPEEDS, teamColorOptions } from './model-info.ts';
import { cameraPosition, type Orbit, orbitFromExtent, panOrbit, rotateOrbit, zoomOrbit } from './orbit.ts';
import { createTextureResolver, summarizeMissing } from './textures.ts';
import { fetchBytes, goLive, h, labelledSelect, showMessage, toolButton, toolbar } from './ui.ts';

type ModelViewer = import('mdx-m3-viewer-th/dist/cjs/viewer/viewer.js').default;
type Handler = import('mdx-m3-viewer-th/dist/cjs/viewer/viewer.js').Handler;
type Scene = import('mdx-m3-viewer-th/dist/cjs/viewer/scene.js').default;
type MdxModel = import('mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/model.js').default;
type MdxModelInstance = import('mdx-m3-viewer-th/dist/cjs/viewer/handlers/mdx/modelinstance.js').default;
type MdlxModel = import('mdx-m3-viewer-th/dist/cjs/parsers/mdlx/model.js').default;

const ModelViewerClass = cjsDefault<new (canvas: HTMLCanvasElement) => ModelViewer>(ModelViewerModule);
const MdlxModelClass = cjsDefault<new () => MdlxModel>(MdlxModelModule);
const handler = (module: unknown) => cjsDefault<Handler>(module, isHandler);

/** Loading continues in the background after this; the model is shown with whatever has arrived. */
const LOAD_TIMEOUT_MS = 20_000;
const LOOP_ALWAYS = 2;

/** A 2×2 grey checker used for textures that are not available; the viewer accepts canvases as textures. */
function checkerTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#4b555c';
    context.fillRect(0, 0, 2, 2);
    context.fillStyle = '#8a949a';
    context.fillRect(0, 0, 1, 1);
    context.fillRect(1, 1, 1, 1);
  }
  return canvas;
}

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const modelFile = files.find((file) => file.role === 'model');
  if (!modelFile) throw new Error('this resource has no model file');
  showMessage(preview, 'Loading 3D preview…');

  const bytes = await fetchBytes(modelFile.url);
  const parser = new MdlxModelClass();
  parser.load(modelFile.format === 'mdl' ? new TextDecoder().decode(bytes) : bytes.slice());
  const hd = isHdModel(parser.version, parser.materials.map((material) => material.shader));
  // Event objects (footprints, sounds) need the game's SLK tables, which are not hosted.
  parser.eventObjects = [];

  let gameTextures: GameTextureMap = {};
  try {
    gameTextures = JSON.parse(preview.dataset.gameTextures ?? '{}');
  } catch { /* A malformed attribute only means game textures show as stand-ins. */ }
  const resolver = createTextureResolver(files, gameTextures, checkerTexture);

  const title = document.querySelector('h1')?.textContent?.trim() || 'the model';
  const canvas = h('canvas', { class: 'model-canvas', role: 'img', tabindex: '0', 'aria-label': `3D view of ${title}` });
  const viewer = new ModelViewerClass(canvas); // Throws when WebGL is unavailable.
  const release = () => {
    viewer.clear();
    viewer.gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  try {
    // Without a listener the viewer's event emitter throws on the first failed request.
    viewer.on('error', () => {});
    if (!viewer.addHandler(handler(MdxHandlerModule), resolver.solve, hd)) throw new Error('this browser lacks WebGL features the viewer needs');
    viewer.addHandler(handler(BlpHandlerModule));
    viewer.addHandler(handler(DdsHandlerModule));
    viewer.addHandler(handler(TgaHandlerModule));
    const scene = viewer.addScene();
    [scene.color[0], scene.color[1], scene.color[2]] = [0.05, 0.08, 0.1];
    const model = await viewer.load(parser, resolver.solve) as MdxModel | undefined;
    if (!model) throw new Error('the viewer could not read this model');
    const instance = model.addInstance();
    instance.setScene(scene);
    instance.setSequenceLoopMode(LOOP_ALWAYS);
    await Promise.race([viewer.whenAllLoaded(), new Promise((resolve) => setTimeout(resolve, LOAD_TIMEOUT_MS))]);
    // Everything fallible in startViewer runs before it goes live, so a failure here still releases the viewer.
    return startViewer({ preview, canvas, viewer, scene, instance, parser, hd, missing: resolver.missing, release });
  } catch (error) {
    release();
    throw error;
  }
}

interface ViewerContext {
  preview: HTMLElement;
  canvas: HTMLCanvasElement;
  viewer: ModelViewer;
  scene: Scene;
  instance: MdxModelInstance;
  parser: MdlxModel;
  hd: boolean;
  missing: Set<string>;
  release: () => void;
}

function startViewer({ preview, canvas, viewer, scene, instance, parser, hd, missing, release }: ViewerContext): () => void {
  const initial: Orbit = orbitFromExtent(parser.extent.min, parser.extent.max);
  let orbit = initial;
  let playing = true;
  let speed = 1;
  let onScreen = true;
  let frame = 0;
  let last = performance.now();

  const applyCamera = () => scene.camera.moveToAndFace(cameraPosition(orbit), orbit.target, [0, 0, 1]);
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    scene.viewport[2] = width;
    scene.viewport[3] = height;
    scene.camera.perspective(Math.PI / 4, width / height, 1, orbit.maxDistance * 8);
    applyCamera();
    viewer.updateAndRender(0);
  };
  const tick = (now: number) => {
    const dt = Math.min(now - last, 100);
    last = now;
    viewer.updateAndRender(playing ? dt * speed : 0);
    frame = requestAnimationFrame(tick);
  };
  // Render only while the viewer is on screen and the tab is visible.
  const run = () => {
    const shouldRun = onScreen && document.visibilityState === 'visible';
    if (shouldRun && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } else if (!shouldRun && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  const moveCamera = (next: Orbit) => {
    orbit = next;
    applyCamera();
  };

  const sequences = parser.sequences.map((sequence) => sequence.name);
  const first = defaultSequence(sequences);
  if (first >= 0) instance.setSequence(first);

  const playButton = toolButton('Pause animation', 'Pause', () => togglePlay());
  const togglePlay = () => {
    playing = !playing;
    playButton.textContent = playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
    playButton.title = playButton.getAttribute('aria-label') ?? '';
  };
  const stage = h('div', { class: 'preview-stage preview-model' });
  const controls = toolbar(
    ...(sequences.length
      ? [labelledSelect('Animation', sequences.map((name, index) => ({ value: String(index), text: name || `Sequence ${index + 1}` })), String(first), (value) => instance.setSequence(Number(value)))]
      : []),
    playButton,
    labelledSelect('Speed', SPEEDS.map((value) => ({ value, text: `${value}×` })), '1', (value) => {
      speed = Number(value);
    }),
    labelledSelect('Player colour', teamColorOptions(hd), '0', (value) => instance.setTeamColor(Number(value))),
    toolButton('Reset view', 'Reset view', () => moveCamera(initial)),
    toolButton('Fullscreen', 'Fullscreen', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void stage.requestFullscreen?.();
    }),
    h('span', { class: 'preview-info' }, h('span', { class: 'catalog-badge' }, hd ? 'HD' : 'SD')),
  );
  const unavailable = summarizeMissing(missing);
  stage.append(canvas, controls);
  if (unavailable.length) {
    stage.append(h(
      'details',
      { class: 'model-missing' },
      h('summary', {}, `${unavailable.length} ${unavailable.length === 1 ? 'texture' : 'textures'} not available`),
      h('ul', {}, ...unavailable.map((path) => h('li', {}, path))),
    ));
  }

  // Pointer controls: drag to orbit, right-drag or Shift-drag to pan, wheel or pinch to zoom.
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinch = 0;
  });
  canvas.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      let next = orbit;
      if (pinch) next = zoomOrbit(next, pinch / distance);
      pinch = distance;
      moveCamera(panOrbit(next, dx / 2, dy / 2));
    } else if (event.buttons & 2 || event.shiftKey) {
      moveCamera(panOrbit(orbit, dx, dy));
    } else {
      moveCamera(rotateOrbit(orbit, dx, dy));
    }
  });
  const endPointer = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    pinch = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    moveCamera(zoomOrbit(orbit, event.deltaY > 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => moveCamera(rotateOrbit(orbit, -20, 0)),
      ArrowRight: () => moveCamera(rotateOrbit(orbit, 20, 0)),
      ArrowUp: () => moveCamera(rotateOrbit(orbit, 0, -20)),
      ArrowDown: () => moveCamera(rotateOrbit(orbit, 0, 20)),
      '+': () => moveCamera(zoomOrbit(orbit, 1 / 1.15)),
      '=': () => moveCamera(zoomOrbit(orbit, 1 / 1.15)),
      '-': () => moveCamera(zoomOrbit(orbit, 1.15)),
      '0': () => moveCamera(initial),
      ' ': togglePlay,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });

  // Nothing fallible after goLive: the observers and the first render happen while a failure can still fall back.
  const resizeObserver = new ResizeObserver(resize);
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    run();
  });
  resize();

  goLive(preview, stage);
  resizeObserver.observe(canvas);
  visibility.observe(canvas);
  document.addEventListener('visibilitychange', run);
  run();

  return () => {
    cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver.disconnect();
    visibility.disconnect();
    document.removeEventListener('visibilitychange', run);
    if (document.fullscreenElement === stage) void document.exitFullscreen();
    release();
  };
}
