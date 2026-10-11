import { test, expect } from '@playwright/test';
test('cadastro com confirmação de e-mail e onboarding', async ({ page, request }) => {
  const email = `e2e-${Date.now()}@radar.local`;
  await page.goto('/cadastro');
  await page.getByRole('link', { name: 'Criar minha conta' }).click();
  if (await page.locator('#username').isVisible()) await page.getByRole('link', { name: /Register|Registre|Cadastre/i }).click();
  await page.locator('#email').fill(email);
  await page.locator('#firstName').fill('Teste');
  await page.locator('#lastName').fill('Cadastro');
  await page.locator('#password').fill('TesteCadastro123!');
  await page.locator('#password-confirm').fill('TesteCadastro123!');
  await page.locator('input[type=submit],button[type=submit]').click();
  let messageId: string | undefined;
  await expect(async () => {
    const result = await (await request.get('http://localhost:8025/api/v1/messages')).json() as { messages: { ID: string; To: { Address: string }[] }[] };
    messageId = result.messages.find(message => message.To.some(to => to.Address === email))?.ID;
    expect(messageId).toBeTruthy();
  }).toPass({ timeout: 30000 });
  const message = await (await request.get(`http://localhost:8025/api/v1/message/${messageId}`)).json() as { Text: string; HTML: string };
  const link = (message.Text || message.HTML).match(/http:\/\/localhost:8080\/[^\s"<>]+/)?.[0]?.replaceAll('&amp;', '&');
  expect(link).toBeTruthy();
  await page.goto(link!);
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.locator('html')).toHaveAttribute('data-radar-ready', 'true');
  await page.getByLabel('Nome da empresa').fill(`TESTE CADASTRO E2E ${Date.now()}`);
  await page.getByRole('button', { name: 'Criar empresa e continuar' }).click();
  await expect(page).toHaveURL(/perfil-comercial/);
});
