import { BookOpenText } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  GUIDE_VIEWPORT,
  guideItemVariants,
  guideSectionWhileInView,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { roleMatrix } from './guide-data';

/**
 * Matriz de acesso (G05) — exibida na subpágina `/app/guide/acessos`.
 */
export function MatrizAcessoSection() {
  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);
  const rowStagger = guideStaggerContainer(0.07, rm);

  return (
    <motion.section
      id="matriz-acesso"
      className="card guide-section-target"
      aria-labelledby="matriz-acesso-title"
      data-guide-section="matriz-acesso"
      data-screenshot-id="guide-05"
      {...guideSectionWhileInView(rm)}
    >
      <div className="card__header">
        <div>
          <h2 id="matriz-acesso-title" className="card__title typo-h2">
            Consulta rápida — matriz de acesso
          </h2>
          <p className="card__subtitle guide-prose-narrow typo-body-sm">
            O papel define o que a pessoa pode fazer. O escopo define onde ela pode fazer.
          </p>
        </div>
        <BookOpenText size={18} aria-hidden />
      </div>
      <div className="card__body card__body--compact">
        <div className="table-shell guide-matrix">
          <table className="data-table guide-matrix__table">
            <thead>
              <tr>
                <th scope="col" className="typo-caption">
                  Perfil
                </th>
                <th scope="col" className="typo-caption">
                  Escopo
                </th>
                <th scope="col" className="typo-caption">
                  Capacidade principal
                </th>
              </tr>
            </thead>
            <motion.tbody variants={rowStagger} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}>
              {roleMatrix.map((row) => (
                <motion.tr
                  key={row.role}
                  className={`guide-matrix__row guide-matrix__row--${row.accent}`}
                  variants={guideItemVariants(rm)}
                >
                  <td>
                    <span className="guide-matrix__role">{row.role}</span>
                  </td>
                  <td className="typo-body-sm">{row.scope}</td>
                  <td className="typo-body-sm">{row.can}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
