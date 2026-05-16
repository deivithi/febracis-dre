import { expect, test } from '@playwright/test';

const hasCred = Boolean(process.env.E2E_DRE_EMAIL?.trim() && process.env.E2E_DRE_PASSWORD?.trim());

/**
 * Smoke do hub `/app/assistant` após simplificação da UI (segmentos + chat apenas).
 * Fluxo guiado completo (stepper/teclado) permanece coberto por testes unitários do motor `dreAssistant`.
 */
test('hub assistente: login e chat visível (segmentos Dúvidas / Começar a DRE)', async ({ page }) => {
  test.skip(!hasCred, 'Defina E2E_DRE_EMAIL e E2E_DRE_PASSWORD para rodar este E2E com API real.');
  await page.goto('/app/assistant');

  await expect(page.getByTestId('login-email')).toBeVisible();
  await page.getByTestId('login-email').fill(process.env.E2E_DRE_EMAIL!.trim());
  await page.getByTestId('login-password').fill(process.env.E2E_DRE_PASSWORD!.trim());
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('assistant-page')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('assistant-dock')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('group', { name: 'Modo do assistente' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dúvidas', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Começar a DRE', exact: true })).toBeVisible();
  await expect(page.getByTestId('assistant-hub-workbench')).toBeVisible({ timeout: 35_000 });
});
