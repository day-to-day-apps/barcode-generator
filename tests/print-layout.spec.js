// @ts-check
import { test, expect } from '@playwright/test';

test('print geometry validates A4, Letter and thermal presets', async ({ page }) => {
  await page.goto('/wydruk');
  const result = await page.evaluate(async () => {
    const { calculatePrintGeometry } = await import('/print-builder.js');
    const presets = await (await fetch('/printer-presets.json')).json();
    return presets.presets.map((preset) => ({ id: preset.id, geometry: calculatePrintGeometry({}, preset) }));
  });
  expect(result.length).toBeGreaterThanOrEqual(10);
  for (const row of result) expect(row.geometry.errors, row.id).toEqual([]);
  expect(result.map((row) => row.id)).toEqual(expect.arrayContaining([
    'avery-l7160-a4', 'avery-l7163-a4', 'avery-5160-letter', 'avery-5163-letter',
  ]));
});

test('impossible layouts are rejected before rendering', async ({ page }) => {
  await page.goto('/wydruk');
  const errors = await page.evaluate(async () => {
    const { calculatePrintGeometry } = await import('/print-builder.js');
    return calculatePrintGeometry({}, { page_w_mm: 100, page_h_mm: 50, cols: 3, rows: 2, label_w_mm: 40, label_h_mm: 30, margin_left_mm: 5, margin_right_mm: 5 }).errors;
  });
  expect(errors).toEqual(expect.arrayContaining(['print_layout_overflow_x', 'print_layout_overflow_y']));
});

test('calibration page exposes exact 100 mm and 50 mm references', async ({ page }) => {
  await page.goto('/kalibracja-druku');
  const line = await page.locator('.calibration-line').boundingBox();
  const box = await page.locator('.calibration-square').boundingBox();
  expect(line?.width).toBeCloseTo(377.953, 0);
  expect(box?.width).toBeCloseTo(188.976, 0);
  expect(box?.height).toBeCloseTo(188.976, 0);
});
