// @ts-check
import { test, expect } from '@playwright/test';
import { encodeBulkJobState, decodeBulkJobState } from '../bulk-job-state.js';

test('bulk job state preserves a supported label preset', () => {
  const notes = encodeBulkJobState({ preset: 'avery-l7163-a4' });
  expect(notes).toBe('barcode-bulk:v1:{"preset":"avery-l7163-a4"}');
  expect(decodeBulkJobState(notes, ['avery-l7160-a4', 'avery-l7163-a4'])).toEqual({ preset: 'avery-l7163-a4' });
});

test('bulk generator exposes every documented Avery and thermal format', async ({ page }) => {
  await page.goto('/bulk-barcode-generator');
  const values = await page.locator('#page-preset option').evaluateAll((options) => options.map((option) => option.value));
  expect(values).toEqual(expect.arrayContaining([
    'avery-l7160-a4', 'avery-l7163-a4', 'avery-5160-letter', 'avery-5163-letter',
    'thermal-58x40', 'thermal-62x29', 'thermal-100x50', 'thermal-100x150',
  ]));
});

test('bulk job state safely ignores legacy, malformed and unsupported notes', () => {
  expect(decodeBulkJobState('Created with bulk barcode generator', ['a4-3x8'])).toBeNull();
  expect(decodeBulkJobState('barcode-bulk:v1:{bad json', ['a4-3x8'])).toBeNull();
  expect(decodeBulkJobState('barcode-bulk:v1:{"preset":"unknown"}', ['a4-3x8'])).toBeNull();
  expect(decodeBulkJobState('barcode-bulk:v1:{"preset":"../../bad"}')).toBeNull();
});

test('bulk build publishes and precaches the job-state module', async ({ request }) => {
  const response = await request.get('/bulk-job-state.js');
  expect(response.status()).toBe(200);
  const worker = await (await request.get('/service-worker.js')).text();
  expect(worker).toContain('/bulk-job-state.js');
});
