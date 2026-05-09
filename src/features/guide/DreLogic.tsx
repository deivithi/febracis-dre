import { Calculator } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  GUIDE_VIEWPORT,
  guideCardHover,
  guideItemVariants,
  guideSectionWhileInView,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { formulas } from './guide-data';
import { MetricBusinessCard } from './MetricBusinessCard';
import { MetricTechnicalCard } from './MetricTechnicalCard';

const BUSINESS_METRICS = [
  {
    slug: 'deductions_total',
    title: 'Total de Deduções',
    definition: 'Soma de impostos, royalties e estornos sobre a receita.',
    whenMatters: 'Ajuda a explicar a diferença entre faturamento bruto e a base disponível para a operação.',
    example:
      'Ex.: R$ 9.000 (impostos) + R$ 4.000 (royalties) + R$ 2.000 (estornos) = R$ 15.000 em deduções.',
  },
  {
    slug: 'mc1',
    title: 'Margem de Contribuição 1',
    definition: 'O que sobra após descontar deduções da receita bruta.',
    whenMatters: 'Indica eficiência comercial pura.',
    example: 'R$ 100.000 (receita) − R$ 15.000 (deduções) = R$ 85.000 (MC1).',
  },
  {
    slug: 'event_expenses_total',
    title: 'Despesas de Evento',
    definition: 'Custos diretos da operação do evento (treinador, locação, material).',
    whenMatters: 'Mostra o custo variável diretamente ligado à realização do evento.',
    example:
      'Ex.: R$ 12.000 (treinador) + R$ 5.000 (locação) + R$ 3.000 (material) = R$ 20.000.',
  },
  {
    slug: 'marketing_total',
    title: 'Investimento em Marketing',
    definition: 'Despesas de divulgação e captação alocadas ao período ou ao evento.',
    whenMatters: 'Permite comparar investimento em mídia com o volume de receita obtido.',
    example: 'Ex.: mídia paga R$ 5.000 + produção de conteúdo R$ 3.000 = R$ 8.000.',
  },
  {
    slug: 'default_net',
    title: 'Inadimplência Líquida',
    definition: 'Saldo da inadimplência após considerar recuperações ou ajustes no período.',
    whenMatters: 'Sinaliza risco de crédito e efetividade da cobrança e recuperação.',
    example: 'Ex.: inadimplência bruta R$ 5.000 − recuperações R$ 3.000 = R$ 2.000 líquidos.',
  },
  {
    slug: 'mc2',
    title: 'Margem de Contribuição 2',
    definition:
      'O que sobra após despesas variáveis e marketing — eficiência operacional do evento.',
    whenMatters: 'Indica quanto a operação do evento deixa depois dos custos diretamente variáveis.',
    example:
      'R$ 85.000 (MC1) − R$ 20.000 (evento) − R$ 5.000 (despesas variáveis) − R$ 8.000 (marketing) − R$ 2.000 (inadimplência líquida) = R$ 50.000 (MC2).',
  },
  {
    slug: 'ebitda_1',
    title: 'EBITDA 1 (operacional)',
    definition: 'Resultado operacional antes de impostos sobre o lucro — saúde estrutural da unidade.',
    whenMatters: 'Mostra a capacidade da unidade de gerar caixa operacional antes do imposto sobre lucro.',
    example:
      'R$ 50.000 (MC2) − R$ 12.000 (pessoal) − R$ 5.000 (CTO) − R$ 3.000 (utilidades/serviços) − R$ 4.000 (despesas gerais) = R$ 26.000 (EBITDA 1).',
  },
  {
    slug: 'ebitda_2',
    title: 'EBITDA 2 (líquido)',
    definition: 'Resultado final do período após impostos — o que efetivamente fica.',
    whenMatters: 'Representa o efeito líquido no período após a carga fiscal sobre o lucro.',
    example: 'R$ 26.000 (EBITDA 1) − R$ 4.000 (impostos sobre o lucro) = R$ 22.000 (EBITDA 2).',
  },
] as const;

function PrintGlossary() {
  return (
    <div className="g07-print-area" aria-hidden>
      <header className="g07-print-area__header">
        <h1 className="g07-print-area__h1 typo-h2">Glossário institucional — Lógica da DRE</h1>
        <p className="g07-print-area__meta typo-caption">Portal DRE — referência de negócio e apêndice técnico (Guia G07).</p>
      </header>
      <section className="g07-print-area__section">
        <h2 className="g07-print-area__h2 typo-h2">Visão de negócio</h2>
        <ol className="g07-print-area__list">
          {BUSINESS_METRICS.map((m) => (
            <li key={m.slug} className="g07-print-area__li">
              <p className="g07-print-area__slug typo-mono">{m.slug}</p>
              <p className="g07-print-area__mtitle typo-h3">{m.title}</p>
              <p className="typo-body">{m.definition}</p>
              <p className="typo-body-sm">
                <strong>Quando importa:</strong> {m.whenMatters}
              </p>
              <pre className="g07-print-area__pre typo-mono">{m.example}</pre>
            </li>
          ))}
        </ol>
      </section>
      <section className="g07-print-area__section">
        <h2 className="g07-print-area__h2 typo-h2">Apêndice técnico (SQL / motor)</h2>
        <ul className="g07-print-area__list g07-print-area__list--flat">
          {formulas.map((f) => (
            <li key={f.id}>
              <code className="g07-print-area__code typo-mono">
                {f.label} = {f.expression}
              </code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function DreLogic() {
  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);
  const [dreTab, setDreTab] = useState<'business' | 'technical'>('business');
  const printGlossaryOnlyRef = useRef(false);

  const metricGridVariants = guideStaggerContainer(0.07, rm);

  useEffect(() => {
    const before = () => {
      if (printGlossaryOnlyRef.current) {
        document.body.setAttribute('data-print-g07', 'true');
      }
    };
    const after = () => {
      document.body.removeAttribute('data-print-g07');
      printGlossaryOnlyRef.current = false;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  return (
    <motion.section
      id="g07-formulas"
      className="card dre-logic guide-section-target"
      aria-labelledby="g07-formulas-title"
      data-guide-section="g07-formulas"
      data-screenshot-id={dreTab === 'business' ? 'guide-08' : 'guide-09'}
      {...guideSectionWhileInView(rm)}
    >
      <div className="card__header dre-logic__header">
        <div>
          <p id="g07-dre-logica-eyebrow" className="dre-logic__eyebrow typo-eyebrow">
            COMO O RESULTADO É CALCULADO
          </p>
          <h2 id="g07-formulas-title" className="card__title dre-logic__title typo-h2">
            Da receita bruta ao EBITDA líquido em 4 camadas
          </h2>
          <p className="card__subtitle typo-body-sm">
            Duas leituras: narrativa de negócio (padrão) e fórmulas técnicas usadas pelo motor.
          </p>
        </div>
        <Calculator size={18} aria-hidden />
      </div>

      <div className="card__body dre-logic__body g07-no-print">
        <Tabs
          value={dreTab}
          onValueChange={(v) => setDreTab(v as 'business' | 'technical')}
          className="dre-logic-tabs"
        >
          <TabsList className="dre-logic-tabs__list" aria-label="Modo de explicação da DRE">
            <TabsTrigger className="dre-logic-tabs__trigger typo-body-sm" value="business">
              Visão de negócio
            </TabsTrigger>
            <TabsTrigger className="dre-logic-tabs__trigger typo-body-sm" value="technical">
              Detalhe técnico (SQL)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="business" className="dre-logic-tabs__content">
            <motion.div
              className="dre-logic-business-grid"
              variants={metricGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={GUIDE_VIEWPORT}
            >
              {BUSINESS_METRICS.map((m) => (
                <MetricBusinessCard
                  key={m.slug}
                  slug={m.slug}
                  title={m.title}
                  definition={m.definition}
                  whenMatters={m.whenMatters}
                  example={m.example}
                  variants={guideItemVariants(rm)}
                  whileHover={rm ? undefined : guideCardHover}
                />
              ))}
            </motion.div>
          </TabsContent>
          <TabsContent value="technical" className="dre-logic-tabs__content">
            <motion.div
              className="guide-formulas dre-logic-formulas"
              variants={metricGridVariants}
              initial="hidden"
              whileInView="visible"
              viewport={GUIDE_VIEWPORT}
            >
              {formulas.map((formula) => (
                <MetricTechnicalCard
                  key={formula.id}
                  label={formula.label}
                  expression={formula.expression}
                  variant={formula.variant}
                  variants={guideItemVariants(rm)}
                  whileHover={rm ? undefined : guideCardHover}
                />
              ))}
            </motion.div>
          </TabsContent>
        </Tabs>

        <div className="dre-logic__pdf-row">
          <button
            type="button"
            className="btn btn--secondary dre-logic__pdf-btn"
            onClick={() => {
              printGlossaryOnlyRef.current = true;
              window.print();
            }}
          >
            Baixar tabela completa (PDF)
          </button>
          <span className="dre-logic__pdf-hint typo-caption">Abre a impressão do navegador; salve como PDF se desejar.</span>
        </div>
      </div>

      <PrintGlossary />
    </motion.section>
  );
}
