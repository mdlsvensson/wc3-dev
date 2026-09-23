import { decodeImage, type DecodedImage, type ImageFormat, infoLine } from './decode.ts';
import type { PreviewFile } from './files.ts';
import { alphaOnly, displaySize, type Zoom, ZOOMS } from './image-view.ts';
import { fetchBytes, goLive, h, labelledSelect, pressedButton, toolbar } from './ui.ts';

const FORMATS: ImageFormat[] = ['blp', 'dds', 'tga'];

export async function mount(preview: HTMLElement, files: PreviewFile[]): Promise<() => void> {
  const file = files.find((candidate) => FORMATS.includes(candidate.format as ImageFormat));
  if (!file) throw new Error('this resource has no BLP, DDS, or TGA file');
  const format = file.format as ImageFormat;
  const bytes = await fetchBytes(file.url);
  let image: DecodedImage = decodeImage(format, bytes);
  const fullSize = { width: image.width, height: image.height };
  let zoom: Zoom = 'fit';
  let alpha = false;

  const canvas = h('canvas', { class: 'image-canvas' });
  const viewport = h('div', { class: 'image-viewport checkered', tabindex: '0', role: 'img', 'aria-label': `${file.name} at full size` }, canvas);
  const info = h('span', { class: 'preview-info' }, infoLine(image));

  const layout = () => {
    const size = displaySize(image, { width: viewport.clientWidth, height: viewport.clientHeight }, zoom);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    canvas.classList.toggle('pixelated', size.pixelated);
  };
  const draw = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    const pixels = new Uint8ClampedArray(alpha ? alphaOnly(image.data) : image.data);
    canvas.getContext('2d')?.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
    layout();
  };

  const controls = toolbar(
    labelledSelect('Zoom', ZOOMS.map((value) => ({ value, text: value === 'fit' ? 'Fit' : `${value}×` })), zoom, (value) => {
      zoom = value as Zoom;
      layout();
    }),
    pressedButton('Dark background instead of the transparency grid', 'Dark background', (on) => viewport.classList.toggle('checkered', !on)),
    pressedButton('Show only the alpha channel', 'Alpha only', (on) => {
      alpha = on;
      draw();
    }),
  );
  if (image.mipmaps > 1) {
    const levels = Array.from({ length: image.mipmaps }, (_, level) => ({
      value: String(level),
      text: `${level} (${Math.max(1, fullSize.width >> level)}×${Math.max(1, fullSize.height >> level)})`,
    }));
    controls.append(labelledSelect('Mipmap', levels, '0', (value) => {
      image = decodeImage(format, bytes, Number(value));
      draw();
    }));
  }
  controls.append(info);

  goLive(preview, h('div', { class: 'preview-stage preview-image' }, viewport, controls));
  draw();
  const observer = new ResizeObserver(layout);
  observer.observe(viewport);
  return () => observer.disconnect();
}
