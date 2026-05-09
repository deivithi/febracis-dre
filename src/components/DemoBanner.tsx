import { Beaker } from 'lucide-react';
import { Link } from 'react-router-dom';
import './DemoBanner.css';

/** Faixa só quando o build define exatamente `VITE_APP_MODE=demo`. */
export function DemoBanner() {
  if (import.meta.env.VITE_APP_MODE !== 'demo') {
    return null;
  }

  return (
    <div className="demo-banner" role="status" aria-live="polite">
      <div className="demo-banner__inner">
        <Beaker size={16} className="demo-banner__icon" aria-hidden />
        <span className="demo-banner__text">
          Ambiente de demonstração — dados sintéticos para apresentação
        </span>
        <Link to="/app/guide#roteiro-demo" className="demo-banner__link">
          Saiba mais
        </Link>
      </div>
    </div>
  );
}
