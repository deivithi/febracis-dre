import type { CSSProperties, ReactNode } from 'react';

export type OperationalErrorProps = {
  title: string;
  message: string;
  hint?: string;
  detail?: string;
  children?: ReactNode;
};

const boxStyle: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  padding: '2rem',
  maxWidth: '42rem',
  lineHeight: 1.5,
  color: '#e2e8f0',
  background: '#0f172a',
  minHeight: '100vh',
};

const codeStyle: CSSProperties = {
  background: '#1e293b',
  padding: '0.1rem 0.35rem',
  borderRadius: 4,
};

/**
 * Tela de falha operacional (React). Reutilizável pelo bootstrap e fluxos de auth.
 */
export function OperationalErrorScreen({
  title,
  message,
  hint,
  detail,
  children,
}: OperationalErrorProps) {
  return (
    <div style={boxStyle}>
      <h1 style={{ fontSize: '1.15rem', margin: '0 0 1rem' }}>{title}</h1>
      <p style={{ margin: '0 0 0.75rem' }}>{message}</p>
      {hint ? (
        <p style={{ margin: '0 0 0.75rem', opacity: 0.85, fontSize: '0.9rem' }}>{hint}</p>
      ) : null}
      {detail ? (
        <pre
          style={{
            margin: '1rem 0 0',
            padding: '0.75rem',
            background: '#1e293b',
            borderRadius: 8,
            overflow: 'auto',
            fontSize: '0.8rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {detail}
        </pre>
      ) : null}
      {children ? <div style={{ marginTop: '1rem' }}>{children}</div> : null}
      <p style={{ margin: '1.25rem 0 0', opacity: 0.75, fontSize: '0.85rem' }}>
        Em desenvolvimento local, use <code style={codeStyle}>.env.local</code> na raiz do projeto
        (veja <code style={codeStyle}>.env.example</code>).
      </p>
    </div>
  );
}
