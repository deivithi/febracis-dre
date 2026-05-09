import { Sheet, SheetContent } from '../../components/ui/sheet';
import type { JourneyStepDefinition } from './journeyContent';

export interface StepDetailSheetProps {
  step: JourneyStepDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StepDetailSheet({ step, open, onOpenChange }: StepDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {step ? (
        <SheetContent
          side="right"
          title={`Passo ${step.stepNumber}: ${step.title}`}
          description="Detalhes do passo da trilha do portal DRE"
          className="febracis-sheet__content--journey-detail"
        >
          <div className="journey-detail-sheet">
            <header className="journey-detail-sheet__header">
              <p className="journey-detail-sheet__eyebrow typo-caption">
                Passo {step.stepNumber} de 3 · detalhe
              </p>
              <h2 className="journey-detail-sheet__title typo-h2">{step.title}</h2>
            </header>

            <div className="journey-detail-sheet__body">
              {step.longParagraphs.map((p, i) => (
                <p key={i} className="journey-detail-sheet__para typo-body">
                  {p}
                </p>
              ))}
              <ul className="journey-detail-sheet__list typo-body-sm">
                {step.longBullets.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
