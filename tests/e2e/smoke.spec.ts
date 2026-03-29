import { expect, test } from '@playwright/test';

test.describe('Rotas protegidas', () => {
  test('área /app exige sessão (volta à entrada com login)', async ({ page }) => {
    await page.goto('/app/submissions');

    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
  });
});

test.describe('Landing e login', () => {
  test('exibe narrativa do portal e formulário de acesso', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('resultado da rede');
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
  });

  test('mantém painel de login visível em viewport ampla', async ({ page }) => {
    await page.goto('/');

    const panel = page.locator('.login-page__panel-card');
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(280);
    }
  });
});
