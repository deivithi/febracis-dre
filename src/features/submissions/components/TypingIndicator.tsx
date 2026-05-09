import { Loader2 } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="dre-assistant-chat__typing" role="status" aria-live="polite">
      <div className="dre-assistant-chat__avatar dre-assistant-chat__avatar--typing" aria-hidden>
        <Loader2 className="dre-assistant-chat__typing-spinner" size={14} aria-hidden />
      </div>
      <span className="dre-assistant-chat__typing-copy">A preparar a resposta do assistente</span>
    </div>
  );
}
