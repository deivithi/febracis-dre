import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/sora/300.css';
import '@fontsource/sora/400.css';
import '@fontsource/sora/500.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { renderOperationalErrorToRoot } from './components/operationalErrorDom';

// Design System imports — ordem importa
import './styles/globals.css';
import './styles/typography.css';
import './styles/print.css';
import './styles/components/button.css';
import './styles/components/card.css';
import './styles/components/input.css';
import './styles/components/layout.css';
import './styles/components/module-pages.css';
import './styles/components/validation-checklist.css';
import './features/tour/shepherd-overrides.css';

function installClientErrorHandlers() {
  window.addEventListener('error', (event) => {
    console.error('[febracis-dre:window]', {
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error instanceof Error ? event.error.stack : event.error,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    console.error('[febracis-dre:unhandledrejection]', {
      type: 'unhandledrejection',
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

installClientErrorHandlers();

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
