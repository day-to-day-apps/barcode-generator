import { test, expect } from '@playwright/test';

const languagePages = [
  {
    path: '/bulk-barcode-generator',
    links: ['/avery-label-printing', '/warehouse-barcode-labels', '/thermal-barcode-label-printing', '/kalibracja-druku'],
  },
  {
    path: '/pl/generator-kodow-z-csv',
    links: ['/pl/drukowanie-etykiet-avery', '/pl/etykiety-kreskowe-dla-magazynu', '/pl/druk-kodow-na-drukarce-termicznej', '/kalibracja-druku'],
  },
];

for (const entry of languagePages) {
  test(`${entry.path} links to its printing workflows`, async ({ page, request }) => {
    await page.goto(entry.path);
    for (const href of entry.links) {
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(1);
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });
}
