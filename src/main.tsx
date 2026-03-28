import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Design System imports — ordem importa
import './styles/globals.css';
import './styles/components/button.css';
import './styles/components/card.css';
import './styles/components/input.css';
import './styles/components/layout.css';
import './styles/components/module-pages.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
