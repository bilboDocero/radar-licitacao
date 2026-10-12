import { test, expect } from '@playwright/test';
test('páginas públicas, proteção e fluxo vertical real', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('pageerror', error => { browserErrors.push(error.message); console.error('Browser error:', error.message); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /O próximo contrato/ })).toBeVisible();
  await page.goto('/app');
  await expect(page).toHaveURL(/\/entrar/);
  await page.getByRole('link', { name: 'Entrar na minha conta' }).click();
  await page.locator('#username').fill('demo@radar.local');
  await page.locator('#password').fill('RadarLocal123!');
  await page.locator('#kc-login').click();
  await expect(page).toHaveURL(/\/(onboarding|app)/);
  await page.goto('/onboarding');
  await expect(page.locator('html')).toHaveAttribute('data-radar-ready', 'true');
  await page.getByLabel('Nome da empresa').fill(`TESTE E2E ${Date.now()}`);
  await page.getByRole('button', { name: 'Criar empresa e continuar' }).click();
  await expect(page).toHaveURL(/perfil-comercial/);
  await page.getByLabel('Nome do perfil').fill('Material de escritório');
  await page.getByLabel('Palavras-chave').fill('papel, impressora');
  await page.getByRole('button', { name: 'Criar perfil comercial' }).click();
  await expect(page.getByRole('heading', { name: 'Material de escritório' })).toBeVisible();
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Seu radar, em perspectiva.' })).toBeVisible();
  await page.screenshot({ path: '.local/dashboard.png', fullPage: true });
  await page.goto('/app/radar');
  await expect(page.getByRole('heading', { name: 'Radar de oportunidades' })).toBeVisible();
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  expect(browserErrors).toEqual([]);
  await page.goto('/admin');
  await expect(page.getByText(/Área restrita|Acesso administrativo/).first()).toBeVisible();
});
test('layout público responsivo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /O próximo contrato/ })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: '.local/mobile.png', fullPage: true });
});

test('painel de debug exige autenticação', async ({ page }) => {
  await page.goto('/app/debug');
  await expect(page).toHaveURL(/\/entrar/);
});
