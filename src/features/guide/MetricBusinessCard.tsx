import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';

export type MetricBusinessCardProps = {
  /** Identificador técnico (ex.: mc1), exibido em mono. */
  slug: string;
  /** Título em linguagem de negócio. */
  title: string;
  /** Uma frase de definição. */
  definition: string;
  /** Por que o indicador importa na operação. */
  whenMatters: string;
  /** Exemplo numérico com valores fictícios (PT-BR). */
  example: string;
} & Omit<HTMLMotionProps<'article'>, 'children'>;

export function MetricBusinessCard({
  slug,
  title,
  definition,
  whenMatters,
  example,
  ...motionProps
}: MetricBusinessCardProps) {
  return (
    <motion.article className="metric-business-card" {...motionProps}>
      <p className="metric-business-card__slug typo-mono">{slug}</p>
      <h3 className="metric-business-card__title typo-h3">{title}</h3>
      <p className="metric-business-card__definition typo-body">{definition}</p>
      <p className="metric-business-card__when typo-body-sm">
        <span className="metric-business-card__when-label">Quando importa:</span> {whenMatters}
      </p>
      <pre className="metric-business-card__example typo-mono">{example}</pre>
    </motion.article>
  );
}
