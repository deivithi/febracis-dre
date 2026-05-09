import { expect, test } from '@playwright/test';

/**
 * Caminhos críticos sem credenciais reais: baseURL + protótipo Supabase do `playwright.config`.
 * Fluxos autenticados completos ficam em `assistant-guided.spec.ts` (E2E_DRE_EMAIL/PASSWORD).
 */
test.describe('Caminhos críticos (smoke)', () => {
  test('entrada /login: formulário de acesso visível', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('/app/dashboard sem sessão → permanece no login', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('dashboard-page')).toHaveCount(0);
  });

  test('/app/submissions sem sessão → login; mesa de trabalho ausente', async ({ page }) => {
    await page.goto('/app/submissions');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('submission-workbench')).toHaveCount(0);
  });

  test('/app/assistant sem sessão → login; hub do assistente ausente', async ({ page }) => {
    await page.goto('/app/assistant');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('assistant-page')).toHaveCount(0);
  });
});
