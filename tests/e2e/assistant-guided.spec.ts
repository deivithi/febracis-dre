import { expect, test } from '@playwright/test';

const hasCred = Boolean(process.env.E2E_DRE_EMAIL?.trim() && process.env.E2E_DRE_PASSWORD?.trim());

/**
 * Fluxo ponta-a-ponta do assistente guiado (`cmd:*` + keypad + mini-card).
 * Opcional: defina **E2E_DRE_EMAIL** e **E2E_DRE_PASSWORD** (conta com submissão editável).
 */
test('assistência guiada: Olá → explicar → propor → confirmar → próximo → resumo da fase', async ({
  page,
}) => {
  test.skip(!hasCred, 'Defina E2E_DRE_EMAIL e E2E_DRE_PASSWORD para rodar este E2E com API real.');
  await page.goto('/app/submissions');

  await expect(page.getByTestId('login-email')).toBeVisible();
  await page.getByTestId('login-email').fill(process.env.E2E_DRE_EMAIL!.trim());
  await page.getByTestId('login-password').fill(process.env.E2E_DRE_PASSWORD!.trim());
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('assistant-dock')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('dre-assistant-stepper')).toBeVisible({ timeout: 30_000 });

  const criarOuAbrir = page.getByRole('button', { name: /Criar rascunho|Abrir rascunho/i }).first();
  await criarOuAbrir.click({ timeout: 4000 }).catch(() => {});

  await expect(page.getByTestId('submission-workbench')).toBeVisible({ timeout: 35_000 });

  await page.getByRole('button', { name: 'Olá', exact: true }).click();

  await expect(page.getByRole('toolbar', { name: 'Navegação guiada da DRE' })).toBeVisible({ timeout: 90_000 });

  await page.getByTestId('dre-assistant-cta-explain').click();
  await page.getByRole('button', { name: /^Inserir valor$/ }).click();

  await expect(page.getByTestId('currency-keypad')).toBeVisible();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: '0', exact: true }).click();
  await page.getByRole('button', { name: '0', exact: true }).click();
  await page.getByRole('button', { name: '0', exact: true }).click();
  await page.getByRole('button', { name: '× 10 mil', exact: true }).click();
  await page.getByTestId('currency-keypad-propose').click();

  await expect(page.getByTestId('dre-assistant-hitl-confirm')).toBeVisible({ timeout: 90_000 });
  await page.getByTestId('dre-assistant-hitl-confirm').click();

  await page.getByRole('toolbar', { name: 'Navegação guiada da DRE' }).getByRole('button', { name: /^Próximo$/ }).click();

  await page.getByRole('toolbar', { name: 'Navegação guiada da DRE' }).getByRole('button', { name: /^Resumo da fase$/ }).click();
  await expect(page.getByRole('article').last()).toContainText(/progresso|fase|\d\s*\/\s*\d|por cento/i);
});
