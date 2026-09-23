import type { PreviewFile } from './files.ts';
import { fetchBytes, goLive, h, toolbar } from './ui.ts';
import { downsample, formatTime, mixDown, type Peaks, seekFraction } from './waveform.ts';

const TYPES: Record<string, string> = { wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', flac: 'audio/flac' };

/** Decodes the file for the waveform. Being async, every failure (even `new AudioContext()` throwing) becomes a rejection. */
async function decodeSamples(bytes: Uint8Array<ArrayBuffer>): Promise<Float32Array> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(bytes.slice().buffer);
    return mixDown(Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel)));
  } finally {
    context.close().catch(() => {});
  }
}

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const file = files.find((candidate) => candidate.role === 'audio');
  if (!file) throw new Error('this resource has no audio file');
  const bytes = await fetchBytes(file.url);
  // Play from the downloaded bytes so the file is fetched once, for both playback and the waveform.
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: TYPES[file.format] ?? 'audio/wav' }));
  const audio = new Audio(objectUrl);
  audio.preload = 'auto';

  let samples: Float32Array | undefined;
  // Downsampling is costly for long tracks, so the peaks are reused until the samples or the canvas width change.
  let peaks: Peaks | undefined;
  let frame = 0;
  let disposed = false;
  // While the seek slider is being dragged, playback must not move it under the pointer.
  let seeking = false;

  const canvas = h('canvas', { class: 'waveform', 'aria-hidden': 'true' });
  const play = h('button', { type: 'button', class: 'preview-button audio-play', 'aria-label': 'Play' }, 'Play');
  const time = h('span', { class: 'audio-time' }, '0:00 / 0:00');
  const seek = h('input', { type: 'range', class: 'audio-seek', min: '0', max: '1000', value: '0', 'aria-label': 'Seek' });
  const volume = h('input', { type: 'range', class: 'audio-volume', min: '0', max: '100', value: '100', 'aria-label': 'Volume' });
  const stage = h('div', { class: 'preview-stage preview-audio', tabindex: '0' }, canvas, toolbar(play, time, seek, h('label', { class: 'preview-field' }, h('span', {}, 'Volume'), volume)));

  // Streams and some encoders report an infinite or NaN duration; seeking needs a finite one.
  const hasDuration = () => Number.isFinite(audio.duration) && audio.duration > 0;
  const progress = () => (hasDuration() ? audio.currentTime / audio.duration : 0);
  const draw = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const middle = height / 2;
    const played = progress() * width;
    if (samples) {
      if (peaks?.min.length !== width) peaks = downsample(samples, width);
      for (let x = 0; x < width; x++) {
        context.fillStyle = x < played ? '#f5d518' : '#53636c';
        const top = middle - peaks.max[x] * middle;
        context.fillRect(x, top, 1, Math.max(1, (peaks.max[x] - peaks.min[x]) * middle));
      }
    } else {
      context.fillStyle = '#35434b';
      context.fillRect(0, middle, width, 1);
    }
    context.fillStyle = '#f6f5eb';
    context.fillRect(Math.round(played), 0, Math.max(1, ratio), height);
  };
  const update = () => {
    time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    if (!seeking) seek.value = String(Math.round(progress() * 1000));
    draw();
  };
  const loop = () => {
    update();
    frame = audio.paused ? 0 : requestAnimationFrame(loop);
  };
  const toggle = () => {
    // A refused play() (e.g. an undecodable file) just leaves the player paused.
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  audio.addEventListener('play', () => {
    play.textContent = 'Pause';
    play.setAttribute('aria-label', 'Pause');
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  });
  audio.addEventListener('pause', () => {
    play.textContent = 'Play';
    play.setAttribute('aria-label', 'Play');
    update();
  });
  audio.addEventListener('loadedmetadata', update);
  play.addEventListener('click', toggle);
  seek.addEventListener('pointerdown', () => {
    seeking = true;
  });
  for (const type of ['pointerup', 'pointercancel', 'change']) {
    seek.addEventListener(type, () => {
      seeking = false;
    });
  }
  seek.addEventListener('input', () => {
    if (hasDuration()) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    update();
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
  });
  const seekTo = (event: PointerEvent) => {
    if (hasDuration()) audio.currentTime = seekFraction(event.offsetX, canvas.clientWidth) * audio.duration;
    update();
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    seekTo(event);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (canvas.hasPointerCapture(event.pointerId)) seekTo(event);
  });
  stage.addEventListener('keydown', (event) => {
    // Inputs keep Space, and a focused button already toggles through its own click.
    if (event.key !== ' ' || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    toggle();
  });

  const observer = new ResizeObserver(draw);

  goLive(preview, stage);
  update();
  observer.observe(canvas);

  // The waveform is a bonus: playback works even when the browser cannot decode the file.
  decodeSamples(bytes)
    .then((decoded) => {
      // decodeSamples has already closed its context; after dispose there is nothing left to draw.
      if (disposed) return;
      samples = decoded;
      peaks = undefined;
      draw();
    })
    .catch(() => {});

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    URL.revokeObjectURL(objectUrl);
  };
}
