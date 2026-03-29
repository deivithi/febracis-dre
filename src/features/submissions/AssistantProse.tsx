import { Fragment } from 'react';

function renderInline(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{segment}</Fragment>;
  });
}

/**
 * Exibe respostas do assistente em prosa legível: parágrafos, quebras e títulos ### legados viram ênfase suave.
 */
export function AssistantProse({ text, className }: { text: string; className?: string }) {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return null;
  }

  const blocks = normalized.split(/\n{2,}/);
  const rootClass = ['dre-assistant__prose', 'dre-assistant__prose--chat', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {blocks.map((block, blockIndex) => {
        const lines = block
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const first = lines[0] ?? '';

        if (first.startsWith('### ')) {
          return (
            <div key={blockIndex} className="dre-assistant__prose-block">
              <p className="dre-assistant__prose-lead">{renderInline(first.replace(/^###\s+/, ''))}</p>
              {lines.slice(1).map((line, lineIndex) => (
                <p key={lineIndex} className="dre-assistant__prose-para">
                  {renderInline(line.replace(/^#{1,3}\s+/, ''))}
                </p>
              ))}
            </div>
          );
        }

        return (
          <p key={blockIndex} className="dre-assistant__prose-para">
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line.replace(/^#{1,3}\s+/, ''))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
