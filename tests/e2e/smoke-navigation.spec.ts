import { test, expect } from '@playwright/test';

/**
 * Smoke tests de navegacao — paginas essenciais devem responder 200.
 * Criado pos-auditoria 2026-04-19 (bug #216).
 */

const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/docs', name: 'Docs' },
  { path: '/history', name: 'History' },
];

test.describe('WebScope — navegacao entre paginas principais', () => {
  for (const p of PAGES) {
    test(`${p.name} (${p.path}) responde 200 e renderiza conteudo`, async ({ page }) => {
      const response = await page.goto(p.path);
      expect(response?.status()).toBe(200);

      // Pagina deve ter body visivel
      await expect(page.locator('body')).toBeVisible();

      // Sem erros JS de runtime (console errors)
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.waitForLoadState('networkidle', { timeout: 10_000 });
      expect(errors, `Erros JS na ${p.name}:\n${errors.join('\n')}`).toHaveLength(0);
    });
  }
});
