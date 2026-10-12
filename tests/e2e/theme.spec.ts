import { test, expect } from '@playwright/test';

test.describe('Suporte Completo a Light Mode e Dark Mode (SellerOS)', () => {
  test('Light Desktop: renderização limpa e captura de tela', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /O próximo contrato/ })).toBeVisible();

    // Garante modo claro ativo
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });

    await page.waitForTimeout(300);
    await page.screenshot({ path: '.local/theme-light-desktop.png', fullPage: true });

    // Verifica que botão/link primário possui texto escuro (#111827 / oklch 0.208) sobre fundo laranja (#ff9900)
    const primaryBtn = page.locator('a, button').filter({ hasText: /Começar minha avaliação/i }).first();
    await expect(primaryBtn).toBeVisible();

    const color = await primaryBtn.evaluate((el) => window.getComputedStyle(el).color);
    expect(
      color === 'oklch(0.208 0.042 265.755)' ||
      color === 'rgb(17, 24, 39)' ||
      color === 'rgb(0, 0, 0)',
    ).toBe(true);
  });

  test('Dark Desktop: renderização elegante em fundo escuro e captura de tela', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Ativa modo escuro via classe e localStorage
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('nuxt-color-mode', 'dark');
    });

    await page.waitForTimeout(300);
    await page.screenshot({ path: '.local/theme-dark-desktop.png', fullPage: true });

    // Verifica que fundo do body é o escuro oficial (#0f172a / rgb(15, 23, 42) ou oklch equivalente)
    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const isDarkBg =
      bgColor.includes('15, 23, 42') ||
      bgColor.includes('oklch(0.208') ||
      bgColor.includes('rgb(15');
    expect(isDarkBg).toBe(true);

    // Botão primário continua com texto escuro garantindo contraste sobre laranja
    const primaryBtn = page.locator('a, button').filter({ hasText: /Começar minha avaliação/i }).first();
    const color = await primaryBtn.evaluate((el) => window.getComputedStyle(el).color);
    expect(
      color === 'oklch(0.208 0.042 265.755)' ||
      color === 'rgb(17, 24, 39)' ||
      color === 'rgb(0, 0, 0)',
    ).toBe(true);
  });

  test('Light Mobile: layout responsivo sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });

    await page.waitForTimeout(300);
    await page.screenshot({ path: '.local/theme-light-mobile.png', fullPage: true });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test('Dark Mobile: layout escuro responsivo sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('nuxt-color-mode', 'dark');
    });

    await page.waitForTimeout(300);
    await page.screenshot({ path: '.local/theme-dark-mobile.png', fullPage: true });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });

  test('Alternância interativa de tema pelo botão UColorModeButton', async ({ page }) => {
    await page.goto('/');

    const colorModeBtn = page
      .locator('button')
      .filter({ has: page.locator('.i-lucide-sun, .i-lucide-moon') })
      .first();

    if (await colorModeBtn.isVisible()) {
      const initialMode = await page.evaluate(() => document.documentElement.className);
      await colorModeBtn.click();
      await page.waitForTimeout(500);
      const afterMode = await page.evaluate(() => document.documentElement.className);
      expect(afterMode).not.toBe(initialMode);
    }
  });
});
