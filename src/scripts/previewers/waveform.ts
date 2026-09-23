export interface Peaks { min: Float32Array; max: Float32Array }

/** One min/max pair per bucket, for drawing a waveform `buckets` pixels wide. */
export function downsample(samples: Float32Array, buckets: number): Peaks {
  const count = Math.max(1, Math.floor(buckets));
  const min = new Float32Array(count);
  const max = new Float32Array(count);
  const size = samples.length / count;
  for (let bucket = 0; bucket < count; bucket++) {
    const start = Math.floor(bucket * size);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * size));
    // Start at zero so silent stretches draw a flat line.
    let low = 0;
    let high = 0;
    for (let index = start; index < end && index < samples.length; index++) {
      const value = samples[index];
      if (value < low) low = value;
      if (value > high) high = value;
    }
    min[bucket] = low;
    max[bucket] = high;
  }
  return { min, max };
}

export function mixDown(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const mixed = new Float32Array(channels[0]?.length ?? 0);
  for (const channel of channels) for (let index = 0; index < mixed.length; index++) mixed[index] += channel[index] / channels.length;
  return mixed;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export const seekFraction = (x: number, width: number): number => (width > 0 ? Math.min(1, Math.max(0, x / width)) : 0);
