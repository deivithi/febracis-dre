import type { RoleCode } from '../features/auth/auth.types';

export type ShortcutCategory = 'nav' | 'actions' | 'edit' | 'approvals' | 'view';

/** Âmbito de exibição no painel de ajuda e filtragem; binding efectivo fica nos hooks. */
export type ShortcutScope =
  | 'global'
  | `page:${string}`
  | `role:${RoleCode}`;

export interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  /**
   * Texto neutro para UI: use `Mod` para Ctrl (Windows/Linux) ou ⌘ (macOS)
   * via {@link formatShortcutLabel}.
   */
  keys: string;
  description: string;
  scope?: ShortcutScope;
  handler?: never;
}

export const CATEGORY_LABELS_PT: Record<ShortcutCategory, string> = {
  nav: 'Navegação',
  actions: 'Ações',
  edit: 'Edição',
  approvals: 'Aprovações',
  view: 'Visualização',
};

/** Fonte única de verdade — handlers não ficam aqui (apenas metadados para UI e documentação). */
export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
  {
    id: 'palette.open',
    category: 'nav',
    keys: 'Mod+/',
    description: 'Abrir a paleta de comandos global (U15).',
    scope: 'global',
  },
  {
    id: 'shortcuts.cheatSheet',
    category: 'view',
    keys: '?',
    description: 'Abrir esta folha de atalhos.',
    scope: 'global',
  },
  {
    id: 'nav.gotoDashboard',
    category: 'nav',
    keys: 'G → D',
    description: 'Ir para o Dashboard.',
    scope: 'global',
  },
  {
    id: 'nav.gotoSubmissions',
    category: 'nav',
    keys: 'G → S',
    description: 'Ir para Submissões.',
    scope: 'global',
  },
  {
    id: 'nav.gotoApprovals',
    category: 'nav',
    keys: 'G → A',
    description: 'Ir para Aprovações.',
    scope: 'global',
  },
  {
    id: 'nav.gotoAudit',
    category: 'nav',
    keys: 'G → U',
    description: 'Ir para Auditoria.',
    scope: 'global',
  },
  {
    id: 'theme.toggleResolved',
    category: 'view',
    keys: 'Mod+Shift+L',
    description: 'Alternar tema claro / escuro (U23; sincroniza com o perfil quando possível).',
    scope: 'global',
  },
  {
    id: 'sidebar.toggle',
    category: 'view',
    keys: 'Mod+B',
    description: 'Recolher ou expandir a barra lateral.',
    scope: 'global',
  },
  {
    id: 'audit.focusSearch',
    category: 'nav',
    keys: '/',
    description: 'Focar a busca na página de Auditoria.',
    scope: 'page:/app/audit',
  },
  {
    id: 'audit.commandPalette',
    category: 'actions',
    keys: 'Mod+K',
    description: 'Paleta de filtros e comandos da Auditoria (U03) — apenas nesta rota.',
    scope: 'page:/app/audit',
  },
  {
    id: 'submission.new',
    category: 'actions',
    keys: 'N',
    description: 'Nova submissão: ir a Submissões com foco limpo para criar rascunho.',
    scope: 'global',
  },
  {
    id: 'submission.saveDraft',
    category: 'actions',
    keys: 'Mod+S',
    description:
      'Salvar rascunho na página Submissões. Intercepta o “Salvar página” do navegador neste contexto.',
    scope: 'page:/app/submissions',
  },
  {
    id: 'submission.submitReview',
    category: 'actions',
    keys: 'Mod+Enter',
    description: 'Enviar para revisão (Submissões, quando permitido).',
    scope: 'page:/app/submissions',
  },
  {
    id: 'workflow.approve',
    category: 'approvals',
    keys: 'E',
    description: 'Aprovar a DRE selecionada na fila de Aprovações.',
    scope: 'page:/app/workflow',
  },
  {
    id: 'workflow.return',
    category: 'approvals',
    keys: 'R',
    description: 'Devolver para ajuste (requer parecer preenchido).',
    scope: 'page:/app/workflow',
  },
  {
    id: 'approvals.batchApproveNavigate',
    category: 'approvals',
    keys: 'Mod+Shift+A',
    description:
      'Abre Aprovações para fluxo em lote (equivalente à entrada na paleta); execução total depende da mesa.',
    scope: 'global',
  },
  {
    id: 'approvals.batchReturnNavigate',
    category: 'approvals',
    keys: 'Mod+Shift+R',
    description: 'Abre Aprovações — devoluções em lote ainda por automatizar.',
    scope: 'global',
  },
  {
    id: 'edit.lineComment',
    category: 'edit',
    keys: 'C',
    description:
      '[Planeado U28] Comentário por linha na grelha — não ligado globalmente para evitar conflito com campo de texto.',
    scope: 'page:/app/submissions',
  },
  {
    id: 'list.jkNavigate',
    category: 'nav',
    keys: 'J / K',
    description:
      '[TODO] Mover seleção nas listas (Submissões / Aprovações) quando o contentor tiver foco (`data-shortcut-list`).',
    scope: 'global',
  },
  {
    id: 'dialog.escape',
    category: 'view',
    keys: 'Esc',
    description: 'Fechar diálogos (paleta, folhas modais).',
    scope: 'global',
  },
];

export const SHORTCUT_BY_ID = new Map(SHORTCUT_REGISTRY.map((s) => [s.id, s] as const));

export type ShortcutOs = 'mac' | 'other';

export function detectShortcutOs(): ShortcutOs {
  if (typeof navigator === 'undefined') return 'other';
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform) ? 'mac' : 'other';
}

/**
 * Troca `Mod` por ⌘ ou Ctrl consoante o SO; mantém o resto literal.
 */
export function formatShortcutLabel(keys: string, os: ShortcutOs = detectShortcutOs()): string {
  const mod = os === 'mac' ? '⌘' : 'Ctrl';
  return keys.replace(/\bMod\b/g, mod);
}

function pathMatchesScope(pathPrefix: string, pathname: string): boolean {
  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

export function matchesShortcutScope(
  scope: ShortcutScope | undefined,
  pathname: string,
  roleCodes: RoleCode[],
): boolean {
  if (!scope || scope === 'global') return true;
  if (scope.startsWith('page:')) {
    const p = scope.slice('page:'.length);
    return pathMatchesScope(p, pathname);
  }
  if (scope.startsWith('role:')) {
    const code = scope.slice('role:'.length) as RoleCode;
    return roleCodes.includes(code);
  }
  return true;
}

export type ShortcutSheetContext = {
  canManageReview: boolean;
  canOperateSubmission: boolean;
};

/**
 * Entradas para o painel ? — filtra por rota, papel e área de aprovações.
 */
export function filterShortcutsForSheet(
  pathname: string,
  roleCodes: RoleCode[],
  ctx: ShortcutSheetContext,
): ShortcutDefinition[] {
  return SHORTCUT_REGISTRY.filter((def) => {
    if (def.category === 'approvals' && !ctx.canManageReview) return false;
    if (
      (def.id === 'submission.new' ||
        def.id === 'submission.saveDraft' ||
        def.id === 'submission.submitReview') &&
      !ctx.canOperateSubmission
    ) {
      return false;
    }
    return matchesShortcutScope(def.scope, pathname, roleCodes);
  });
}

/** Legenda para `title` / tooltips */
export function getShortcutTooltipParts(shortcutId: string): { keys: string; summary: string } | null {
  const def = SHORTCUT_BY_ID.get(shortcutId);
  if (!def) return null;
  return {
    keys: formatShortcutLabel(def.keys),
    summary: def.description,
  };
}

export function getShortcutTitle(shortcutId: string): string | undefined {
  const parts = getShortcutTooltipParts(shortcutId);
  if (!parts) return undefined;
  return `${parts.keys} — ${parts.summary}`;
}
