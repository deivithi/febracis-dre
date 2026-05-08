import { expect, test } from '@playwright/test';

const hasCred = Boolean(process.env.E2E_DRE_EMAIL?.trim() && process.env.E2E_DRE_PASSWORD?.trim());

/**
 * Captura screenshots do portal para a demo CEO (rede febracis).
 *
 * Saída: `tests/e2e/__screenshots__/{painel-executivo,submissoes-rail,assistente-hub}.png`.
 *
 * Por defeito faz **skip** quando `E2E_DRE_EMAIL` / `E2E_DRE_PASSWORD` não estão definidos —
 * evita ruído no CI smoke. Para gerar localmente:
 *
 * ```sh
 * E2E_DRE_EMAIL=... E2E_DRE_PASSWORD=... npm run test:e2e -- demo-screenshots
 * ```
 */
test.describe('Demo CEO · Capturas executivas', () => {
  test.skip(!hasCred, 'Defina E2E_DRE_EMAIL e E2E_DRE_PASSWORD para gerar capturas executivas.');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await page.getByTestId('login-email').fill(process.env.E2E_DRE_EMAIL!.trim());
    await page.getByTestId('login-password').fill(process.env.E2E_DRE_PASSWORD!.trim());
    await page.getByTestId('login-submit').click();
    await page.waitForURL(/\/app\//, { timeout: 45_000 });
  });

  test('painel executivo (Dashboard)', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: /Painel executivo/i })).toBeVisible({
      timeout: 30_000,
    });
    // Aguarda primeiro KPI carregar para garantir snapshot estável.
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'tests/e2e/__screenshots__/painel-executivo.png',
      fullPage: true,
    });
  });

  test('rail executivo de Submissões', async ({ page }) => {
    await page.goto('/app/submissions');
    await expect(page.getByTestId('submission-workbench')).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'tests/e2e/__screenshots__/submissoes-rail.png',
      fullPage: true,
    });
  });

  test('hub Assistente', async ({ page }) => {
    await page.goto('/app/assistant');
    await expect(page.getByTestId('assistant-dock')).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'tests/e2e/__screenshots__/assistente-hub.png',
      fullPage: true,
    });
  });
});
