import { test, expect } from '@playwright/test';

/**
 * Smoke tests para WebScope — fluxo principal home → analyze → report.
 *
 * Criado pos-auditoria 2026-04-19 (bug #216).
 * Cobertura minima: 3 cenarios essenciais. Expandir conforme features.
 *
 * Pre-requisito: webServer do playwright.config inicia `npx astro dev --port 4321`.
 */

test.describe('WebScope — home page smoke', () => {
  test('home carrega com titulo e CTA principal', async ({ page }) => {
    await page.goto('/');

    // Titulo da pagina
    await expect(page).toHaveTitle(/WebScope/i);

    // Hero visivel
    const hero = page.locator('h1, [role="heading"][aria-level="1"]').first();
    await expect(hero).toBeVisible();

    // Ao menos um input ou botao de analise visivel (CTA principal)
    const cta = page.locator('input[type="url"], input[type="text"], button[type="submit"]').first();
    await expect(cta).toBeVisible();
  });

  test('meta tags SEO presentes', async ({ page }) => {
    await page.goto('/');

    // description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);

    // viewport
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    // canonical
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
  });

  test('navigacao principal acessivel via teclado', async ({ page }) => {
    await page.goto('/');

    // Tab pelo primeiro elemento focavel
    await page.keyboard.press('Tab');

    // Algum elemento deve ter foco apos primeiro Tab
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    expect(['A', 'BUTTON', 'INPUT', 'DETAILS', 'SUMMARY']).toContain(focused);
  });
});
