export const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Small element builder: h('button', { type: 'button' }, 'Play'). `true` sets a boolean attribute; false/undefined skip it. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | boolean | undefined> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === true) element.setAttribute(name, '');
    else if (typeof value === 'string') element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

/** Shows a one-line status in the preview area, with an optional Retry button. */
export function showMessage(preview: HTMLElement, text: string, retry?: () => void): void {
  const message = preview.querySelector<HTMLElement>('.preview-message');
  if (!message) return;
  message.replaceChildren(text);
  if (retry) {
    const button = h('button', { type: 'button', class: 'preview-button preview-retry' }, 'Retry');
    button.addEventListener('click', () => {
      message.hidden = true;
      retry();
    });
    message.append(' ', button);
  }
  message.hidden = false;
}

/** Swaps the static fallback for a ready previewer. */
export function goLive(preview: HTMLElement, stage: HTMLElement): void {
  preview.querySelector('.preview-stage')?.remove();
  const message = preview.querySelector<HTMLElement>('.preview-message');
  if (message) message.hidden = true;
  preview.append(stage);
  preview.classList.add('is-live');
}

export const toolbar = (...children: (Node | string)[]): HTMLDivElement => h('div', { class: 'preview-toolbar' }, ...children);

export function toolButton(label: string, text: string, onClick: () => void): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'preview-button', title: label, 'aria-label': label }, text);
  button.addEventListener('click', onClick);
  return button;
}

/** A toggle button whose state is exposed through aria-pressed. */
export function pressedButton(label: string, text: string, onToggle: (pressed: boolean) => void, pressed = false): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'preview-button', title: label, 'aria-label': label, 'aria-pressed': String(pressed) }, text);
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(next));
    onToggle(next);
  });
  return button;
}

export function labelledSelect(
  label: string,
  options: { value: string; text: string }[],
  value: string,
  onChange: (value: string) => void,
): HTMLLabelElement {
  const select = h('select', { class: 'preview-select' });
  for (const option of options) select.append(h('option', { value: option.value, selected: option.value === value }, option.text));
  select.addEventListener('change', () => onChange(select.value));
  return h('label', { class: 'preview-field' }, h('span', {}, label), select);
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`the file returned HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
