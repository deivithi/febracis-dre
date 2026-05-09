import { TooltipContent, TooltipRoot, TooltipTrigger } from '../../components/ui/tooltip';

/**
 * Tour guiado **dedicado** à apresentação para diretoria (U20).
 * Shepherd está instalado para o tour geral da plataforma, mas não expomos
 * um fluxo “apresentação guiada” separado até existir configuração explícita (U20).
 */
export const GUIDED_DEMO_PRESENTATION_TOUR_READY = false;

export function GuidedPresentationCta() {
  const label = 'Iniciar apresentação guiada';

  if (GUIDED_DEMO_PRESENTATION_TOUR_READY) {
    return (
      <button type="button" className="btn btn--gold demo-roadmap__guided-btn">
        {label}
      </button>
    );
  }

  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <span className="demo-roadmap__tooltip-anchor">
          <button
            type="button"
            className="btn btn--gold demo-roadmap__guided-btn"
            disabled
            aria-disabled="true"
            title="Em breve"
          >
            {label}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Em breve</TooltipContent>
    </TooltipRoot>
  );
}
