import type { NavigateFunction } from 'react-router-dom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenText,
  ClipboardCheck,
  Eye,
  FileSpreadsheet,
  Filter,
  Grid3x3,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Radar,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { StepOptions, Tour } from 'shepherd.js';
import type { AccessProfile, RoleCode } from '../auth/auth.types';

export type TourVariant = 'holding' | 'controller' | 'operator' | 'viewer';

const TOUR_TOTAL = 5;

export function resolveTourVariant(profile: AccessProfile): TourVariant {
  if (profile.dashboardScope === 'holding') {
    return 'holding';
  }
  if (profile.canManageReview) {
    return 'controller';
  }
  if (profile.canOperateSubmission) {
    return 'operator';
  }
  return 'viewer';
}

function bodyEl(Icon: LucideIcon, stepIndex: number, description: string): HTMLElement {
  const wrap = document.createElement('div');

  const iconRow = document.createElement('div');
  iconRow.className = 'shepherd-title-row';
  iconRow.style.display = 'flex';
  iconRow.style.alignItems = 'center';
  iconRow.style.marginBottom = '0.35rem';
  iconRow.innerHTML = renderToStaticMarkup(createElement(Icon, { size: 20, 'aria-hidden': true }));
  wrap.appendChild(iconRow);

  const progress = document.createElement('p');
  progress.className = 'font-mono shepherd-progress';
  progress.textContent = `Passo ${stepIndex + 1} de ${TOUR_TOTAL}`;
  wrap.appendChild(progress);

  const body = document.createElement('p');
  body.style.margin = '0';
  body.textContent = description;
  wrap.appendChild(body);
  return wrap;
}

function navTourIfNeeded(navigate: NavigateFunction, targetPath: string, currentPath: string): Promise<void> {
  if (currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)) {
    return Promise.resolve();
  }
  navigate(targetPath);
  return new Promise((resolve) => {
    window.setTimeout(resolve, 320);
  });
}

type BuildCtx = {
  tour: Tour;
  variant: TourVariant;
  navigate: NavigateFunction;
  currentPath: string;
};

function buildButtons(ctx: BuildCtx, stepIndex: number, total: number): StepOptions['buttons'] {
  const { tour } = ctx;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  return [
    {
      text: 'Voltar',
      disabled: isFirst,
      classes: 'shepherd-button shepherd-button-secondary',
      action() {
        tour.back();
      },
    },
    {
      text: 'Pular tour',
      classes: 'shepherd-button shepherd-button-secondary',
      action() {
        void tour.cancel();
      },
    },
    {
      text: isLast ? 'Concluir' : 'Próximo',
      classes: 'shepherd-button',
      action() {
        if (isLast) {
          tour.complete();
        } else {
          tour.next();
        }
      },
    },
  ];
}

function baseStep(
  ctx: BuildCtx,
  stepIndex: number,
  partial: Omit<StepOptions, 'buttons' | 'title' | 'text'> & {
    icon: LucideIcon;
    title: string;
    description: string;
  },
): StepOptions {
  return {
    ...partial,
    title: partial.title,
    text: bodyEl(partial.icon, stepIndex, partial.description),
    buttons: buildButtons(ctx, stepIndex, TOUR_TOTAL),
  };
}

function stepsOperator(ctx: BuildCtx): StepOptions[] {
  const { navigate, currentPath } = ctx;
  return [
    baseStep(ctx, 0, {
      id: 'op-nav',
      attachTo: { element: '[data-tour-id="nav-submissions"]', on: 'right' },
      icon: FileSpreadsheet,
      title: 'Submissões',
      description:
        'Aqui você acessa o workspace oficial: escolhe coligada, competência e evento, e trabalha a DRE até o envio para revisão.',
    }),
    baseStep(ctx, 1, {
      id: 'op-grid',
      attachTo: { element: '[data-tour-id="dre-input-grid"]', on: 'bottom' },
      icon: Grid3x3,
      title: 'Grelha da DRE',
      description:
        'O preenchimento acontece nesta área: linhas editáveis e cálculo derivado acompanham o rascunho em tempo real.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/submissions', currentPath);
      },
    }),
    baseStep(ctx, 2, {
      id: 'op-validation',
      attachTo: { element: '[data-tour-id="validation-panel"]', on: 'left' },
      icon: ShieldCheck,
      title: 'Verificações',
      description:
        'Regras da governança aparecem aqui após gravar. Corrija pendências antes de enviar para a controladoria.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/submissions', currentPath);
      },
    }),
    baseStep(ctx, 3, {
      id: 'op-submit',
      attachTo: { element: '[data-tour-id="submit-review-cta"]', on: 'top' },
      icon: Send,
      title: 'Enviar para revisão',
      description:
        'Quando as verificações estiverem ok, use este botão para entregar a versão ao fluxo de aprovação.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/submissions', currentPath);
      },
    }),
    baseStep(ctx, 4, {
      id: 'op-bell',
      attachTo: { element: '[data-tour-id="notifications-bell"]', on: 'bottom' },
      icon: Bell,
      title: 'Notificações',
      description: 'Alertas de devolução, aprovação e pendências chegam no sino — confira com frequência.',
    }),
  ];
}

function stepsController(ctx: BuildCtx): StepOptions[] {
  const { navigate, currentPath } = ctx;
  return [
    baseStep(ctx, 0, {
      id: 'ctl-nav',
      attachTo: { element: '[data-tour-id="nav-approvals"]', on: 'right' },
      icon: ClipboardCheck,
      title: 'Aprovações',
      description: 'A mesa da controladoria começa aqui: fila priorizada de DREs aguardando parecer.',
    }),
    baseStep(ctx, 1, {
      id: 'ctl-queue',
      attachTo: { element: '[data-tour-id="workflow-queue"]', on: 'bottom' },
      icon: ListOrdered,
      title: 'Fila de revisão',
      description: 'Selecione uma linha para abrir o detalhe. Ordenação e export apoiam o triagem diária.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/workflow', currentPath);
      },
    }),
    baseStep(ctx, 2, {
      id: 'ctl-decision',
      attachTo: { element: '[data-tour-id="workflow-decision-panel"]', on: 'left' },
      icon: ShieldCheck,
      title: 'Painel de decisão',
      description: 'Assumir revisão, aprovar ou devolver com justificativa — cada ação fica auditável.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/workflow', currentPath);
      },
    }),
    baseStep(ctx, 3, {
      id: 'ctl-validation',
      attachTo: { element: '[data-tour-id="workflow-validation-panel"]', on: 'left' },
      icon: Radar,
      title: 'Verificações da DRE',
      description:
        'Checklist automático e pendências abertas em um só lugar para orientar o parecer técnico.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/workflow', currentPath);
      },
    }),
    baseStep(ctx, 4, {
      id: 'ctl-bell',
      attachTo: { element: '[data-tour-id="notifications-bell"]', on: 'bottom' },
      icon: Bell,
      title: 'Notificações',
      description: 'Receba lembretes de novos envios e mudanças de status sem sair do fluxo.',
    }),
  ];
}

function stepsHolding(ctx: BuildCtx): StepOptions[] {
  const { navigate, currentPath } = ctx;
  return [
    baseStep(ctx, 0, {
      id: 'hol-nav',
      attachTo: { element: '[data-tour-id="nav-dashboard"]', on: 'right' },
      icon: LayoutDashboard,
      title: 'Dashboard executivo',
      description: 'Visão consolidada da rede: KPIs oficiais e cockpit partirão sempre do escopo ativo.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/dashboard', currentPath);
      },
    }),
    baseStep(ctx, 1, {
      id: 'hol-filters',
      attachTo: { element: '[data-tour-id="holding-cockpit-filters"]', on: 'bottom' },
      icon: Filter,
      title: 'Filtros do cockpit',
      description: 'Recorte competência, regional e unidade para sair do agregado e focar onde importa.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/dashboard', currentPath);
      },
    }),
    baseStep(ctx, 2, {
      id: 'hol-rank',
      attachTo: { element: '[data-tour-id="holding-ranking"]', on: 'top' },
      icon: BarChart3,
      title: 'Ranking do recorte',
      description: 'Compare RBV, margem e EBITDA 2 das unidades visíveis, com status oficial da submissão.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/dashboard', currentPath);
      },
    }),
    baseStep(ctx, 3, {
      id: 'hol-kpis',
      attachTo: { element: '[data-tour-id="dashboard-kpi-section"]', on: 'bottom' },
      icon: Activity,
      title: 'Resumo da competência',
      description: 'Indicadores-resumo fecham a leitura executiva antes de mergulhar no cockpit.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/dashboard', currentPath);
      },
    }),
    baseStep(ctx, 4, {
      id: 'hol-bell',
      attachTo: { element: '[data-tour-id="notifications-bell"]', on: 'bottom' },
      icon: Bell,
      title: 'Notificações',
      description: 'Centralize avisos importantes sem perder o foco do painel.',
    }),
  ];
}

function stepsViewer(ctx: BuildCtx): StepOptions[] {
  const { navigate, currentPath } = ctx;
  return [
    baseStep(ctx, 0, {
      id: 'vw-dash',
      attachTo: { element: '[data-tour-id="nav-dashboard"]', on: 'right' },
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'No modo leitura, o dashboard concentra a narrativa oficial da rede e do seu recorte.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/dashboard', currentPath);
      },
    }),
    baseStep(ctx, 1, {
      id: 'vw-guide',
      attachTo: { element: '[data-tour-id="nav-guide"]', on: 'right' },
      icon: BookOpenText,
      title: 'Guia da plataforma',
      description: 'Material de apoio com jornadas, fórmulas e roteiro de apresentação — sempre disponível.',
    }),
    baseStep(ctx, 2, {
      id: 'vw-scope',
      attachTo: { element: '[data-tour-id="app-header-scope"]', on: 'bottom' },
      icon: Eye,
      title: 'Escopo ativo',
      description: 'Confirme aqui qual carteira você está visualizando antes de interpretar os números.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/dashboard', currentPath);
      },
    }),
    baseStep(ctx, 3, {
      id: 'vw-kpi',
      attachTo: { element: '[data-tour-id="dashboard-kpi-section"]', on: 'bottom' },
      icon: Landmark,
      title: 'Leitura consolidada',
      description: 'Os cartões resumem a competência com base apenas em submissões validadas ou fluxo oficial.',
      beforeShowPromise() {
        return navTourIfNeeded(navigate, '/app/dashboard', currentPath);
      },
    }),
    baseStep(ctx, 4, {
      id: 'vw-bell',
      attachTo: { element: '[data-tour-id="notifications-bell"]', on: 'bottom' },
      icon: Bell,
      title: 'Notificações',
      description: 'Mesmo em leitura, vale acompanhar avisos institucionais ou menções às suas unidades.',
    }),
  ];
}

/**
 * Monta os passos do tour com texto em PT-BR, ícones Lucide no título e botões padronizados.
 * Use `role` com `accessProfile.primaryRole` para rastreabilidade; `variant` vem de `resolveTourVariant`.
 */
export function buildTourForRole(
  role: RoleCode,
  tour: Tour,
  variant: TourVariant,
  navigate: NavigateFunction,
  currentPath: string,
): StepOptions[] {
  void role;
  const ctx: BuildCtx = { tour, variant, navigate, currentPath };
  switch (variant) {
    case 'holding':
      return stepsHolding(ctx);
    case 'controller':
      return stepsController(ctx);
    case 'operator':
      return stepsOperator(ctx);
    case 'viewer':
    default:
      return stepsViewer(ctx);
  }
}
