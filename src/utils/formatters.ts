const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('pt-BR');

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  submitted: 'Enviado',
  under_review: 'Em revisão',
  pending_adjustment: 'Ajuste pendente',
  approved: 'Aprovado',
  closed: 'Fechado',
  reopened: 'Reaberto',
  superseded: 'Substituído',
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  dismissed: 'Descartado',
  insert: 'Inclusão',
  update: 'Atualização',
  delete: 'Exclusão',
  status_change: 'Mudança de status',
  recalculate: 'Reprocessamento',
};

const statusVariants: Record<string, string> = {
  draft: 'draft',
  submitted: 'submitted',
  under_review: 'under_review',
  pending_adjustment: 'pending_adjustment',
  approved: 'approved',
  closed: 'closed',
  reopened: 'submitted',
  superseded: 'draft',
};

export function toNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatCurrency(value: unknown) {
  return currencyFormatter.format(toNumber(value));
}

export function formatInteger(value: unknown) {
  return integerFormatter.format(toNumber(value));
}

export function formatPercent(value: unknown, fractionDigits = 1) {
  return `${toNumber(value).toFixed(fractionDigits).replace('.', ',')}%`;
}

export function formatPeriodLabel(value: string | null | undefined) {
  if (!value) {
    return 'Sem período';
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-');
    return `${month}/${year}`;
  }

  return value;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) {
    return 'Não definido';
  }

  return statusLabels[status] ?? status;
}

export function getStatusVariant(status: string | null | undefined) {
  if (!status) {
    return 'draft';
  }

  return statusVariants[status] ?? 'draft';
}

const validationStatusLabels: Record<string, string> = {
  passed: 'Conforme',
  pass: 'Conforme',
  ok: 'Conforme',
  success: 'Conforme',
  warning: 'Atenção',
  warn: 'Atenção',
  pending: 'Atenção',
  failed: 'Falhou',
  fail: 'Falhou',
  error: 'Falhou',
  blocked: 'Bloqueado',
};

export type ValidationSeverity = 'pass' | 'warn' | 'fail';

export function getValidationSeverity(status: string | null | undefined): ValidationSeverity {
  if (!status) {
    return 'warn';
  }
  const key = status.toLowerCase();
  if (key === 'passed' || key === 'pass' || key === 'ok' || key === 'success') {
    return 'pass';
  }
  if (key === 'failed' || key === 'fail' || key === 'error' || key === 'blocked') {
    return 'fail';
  }
  return 'warn';
}

export function formatValidationStatusLabel(status: string | null | undefined) {
  if (!status) {
    return 'Atenção';
  }
  const key = status.toLowerCase();
  return validationStatusLabels[key] ?? status;
}

export function calculateDelta(current: unknown, previous: unknown) {
  const currentValue = toNumber(current);
  const previousValue = toNumber(previous);

  if (!previousValue) {
    return null;
  }

  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

export function formatDelta(delta: number | null) {
  if (delta === null) {
    return 'Sem base histórica';
  }

  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`;
}

export function isPositiveDelta(delta: number | null) {
  if (delta === null) {
    return true;
  }

  return delta >= 0;
}
