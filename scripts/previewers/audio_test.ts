import { strict as assert } from 'node:assert';
import { downsample, formatTime, mixDown, seekFraction } from '../../src/scripts/previewers/waveform.ts';

Deno.test('downsample keeps each bucket’s extremes, including zero for silence', () => {
  const peaks = downsample(new Float32Array([0.5, -0.25, 0, 0, 1, -1, 0.1, 0.2]), 4);
  assert.deepEqual([...peaks.min], [-0.25, 0, -1, 0]);
  assert.deepEqual([...peaks.max].map((value) => Math.round(value * 10) / 10), [0.5, 0, 1, 0.2]);
});

Deno.test('downsample copes with more buckets than samples', () => {
  const peaks = downsample(new Float32Array([0.5, -0.5]), 4);
  assert.equal(peaks.min.length, 4);
  assert.equal(peaks.max[0], 0.5);
});

Deno.test('mixDown averages channels', () => {
  assert.deepEqual([...mixDown([new Float32Array([1, 0]), new Float32Array([0, -1])])], [0.5, -0.5]);
  assert.deepEqual([...mixDown([new Float32Array([0.25])])], [0.25]);
});

Deno.test('formatTime and seekFraction', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.7), '1:05');
  assert.equal(formatTime(Number.NaN), '0:00');
  assert.equal(seekFraction(50, 200), 0.25);
  assert.equal(seekFraction(-5, 200), 0);
  assert.equal(seekFraction(500, 200), 1);
  assert.equal(seekFraction(10, 0), 0);
});
