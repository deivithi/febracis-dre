import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { renderOperationalErrorToRoot } from './components/operationalErrorDom';

// Design System imports — ordem importa
import './styles/globals.css';
import './styles/components/button.css';
import './styles/components/card.css';
import './styles/components/input.css';
import './styles/components/layout.css';
import './styles/components/module-pages.css';
import './styles/components/validation-checklist.css';

function mount() {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    console.error('[febracis-dre] Elemento #root não encontrado.');
    return;
  }

  try {
    createRoot(rootEl).render(
      <StrictMode>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao montar a aplicação.';
    const detail = error instanceof Error ? error.stack : String(error);
    renderOperationalErrorToRoot(rootEl, {
      title: 'Não foi possível iniciar o portal',
      message,
      hint: 'Se aparecer erro de variáveis VITE_*, configure-as na Vercel (Production) e faça redeploy.',
      detail,
    });
  }
}

mount();
