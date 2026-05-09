import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { WidgetType } from './dashboardLayout.types';

type Blueprint = { type: WidgetType; title: string; blurb: string };

const GALLERY_ITEMS: Blueprint[] = [
  {
    type: 'kpi',
    title: 'Faixa de KPIs',
    blurb: 'Quatro cartões resumidos da competência com sparklines quando disponíveis.',
  },
  {
    type: 'sparkline',
    title: 'Um KPI com tendência',
    blurb: 'Destaque numérico único com série histórica (RPC get_kpi_history).',
  },
  {
    type: 'ranking',
    title: 'Ranking de franquias',
    blurb: 'Top por EBITDA 2 ou unidades com menor margem.',
  },
  {
    type: 'trend-chart',
    title: 'Tendência rede',
    blurb: 'Linha de receita ou EBITDA 2 consolidados por competência.',
  },
  {
    type: 'pending-queue',
    title: 'Fila de revisão',
    blurb: 'DREs pendentes no recorte (holding filtrado quando aplicável).',
  },
  {
    type: 'audit-feed',
    title: 'Trilho de auditoria',
    blurb: 'Últimos eventos do log (leitura rápida no painel).',
  },
];

export type WidgetGalleryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: WidgetType) => void;
};

export function WidgetGallery({ open, onOpenChange, onPick }: WidgetGalleryProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="widget-gallery__overlay" />
        <Dialog.Content className="widget-gallery__content">
          <div className="widget-gallery__header">
            <Dialog.Title className="widget-gallery__title">Galeria de widgets</Dialog.Title>
            <Dialog.Description className="widget-gallery__description sr-only">
              Escolha um bloco para acrescentar ao painel personalizável.
            </Dialog.Description>
            <Dialog.Close className="widget-gallery__close btn btn--ghost" type="button" aria-label="Fechar">
              <X size={20} />
            </Dialog.Close>
          </div>
          <ul className="widget-gallery__list">
            {GALLERY_ITEMS.map((item) => (
              <li key={item.type}>
                <button
                  type="button"
                  className="widget-gallery__card"
                  onClick={() => {
                    onPick(item.type);
                    onOpenChange(false);
                  }}
                >
                  <span className="widget-gallery__thumb" aria-hidden />
                  <span className="widget-gallery__meta">
                    <span className="widget-gallery__card-title">{item.title}</span>
                    <span className="widget-gallery__card-blurb">{item.blurb}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
