-- =========================================================
-- FEBRACIS | MIGRATION 003: SEED DATA
-- =========================================================

begin;

-- =========================================================
-- ROLES
-- =========================================================

insert into public.roles (code, name, description) values
  ('franchise_user', 'Usuário Franquia', 'Operação da unidade — preenche e acompanha DRE'),
  ('regional_manager', 'Gestor Regional', 'Acompanha carteira de franquias da regional'),
  ('finance_controller', 'Controladoria', 'Valida, aprova e audita submissões'),
  ('executive', 'Diretoria', 'Visão executiva consolidada da rede'),
  ('system_admin', 'Administrador', 'Gestão completa do sistema')
on conflict (code) do nothing;

-- =========================================================
-- DRE SECTIONS
-- =========================================================

insert into public.dre_sections (code, name, display_order) values
  ('rbv',               'Receita Bruta de Vendas',  10),
  ('deductions',        'Deduções',                 20),
  ('event_expenses',    'Despesas de Evento',       30),
  ('variable_expenses', 'Despesas Variáveis',       40),
  ('marketing',         'Esforço de Marketing',     50),
  ('default',           'Inadimplência',            60),
  ('structure',         'Estrutura',                70),
  ('taxes',             'Impostos',                 80),
  ('result',            'Resultado',                90)
on conflict (code) do nothing;

-- =========================================================
-- DRE LINES
-- =========================================================

insert into public.dre_lines (
  section_id, code, name, description, line_type, input_mode,
  display_order, is_active, is_editable, affects_dashboard
)
select s.id, x.code, x.name, x.description, x.line_type, x.input_mode,
       x.display_order, true, x.is_editable, true
from public.dre_sections s
join (values
  -- RBV
  ('rbv', 'gross_revenue', 'Receita Bruta de Vendas', 'RBV total da unidade no período', 'input', 'currency', 10, true),

  -- DEDUCTIONS
  ('deductions', 'discounts_returns', 'Descontos / Devoluções', 'Descontos comerciais e devoluções', 'input', 'currency', 10, true),
  ('deductions', 'split_holding', 'Split Holding', 'Repasse para a Holding', 'input', 'currency', 20, true),
  ('deductions', 'cispay', 'Cispay', 'Custo da plataforma Cispay', 'input', 'currency', 30, true),
  ('deductions', 'ed_commission', 'Comissão ED', 'Comissão de Executivos de Desenvolvimento', 'input', 'currency', 40, true),
  ('deductions', 'franchise_fee', 'Taxa de Franquia', 'Taxa periódica de franquia', 'input', 'currency', 50, true),
  ('deductions', 'deductions_total', 'Total Deduções', 'Soma automática de todas as deduções', 'subtotal', null, 90, false),
  ('deductions', 'mc1', 'Margem de Contribuição 1', 'RBV menos deduções', 'subtotal', null, 100, false),

  -- EVENT EXPENSES
  ('event_expenses', 'event_space_rent', 'Locação de Espaço', 'Aluguel do espaço para evento', 'input', 'currency', 10, true),
  ('event_expenses', 'event_decoration', 'Decoração', 'Custos de decoração do evento', 'input', 'currency', 20, true),
  ('event_expenses', 'event_food', 'Alimentação', 'Custos de alimentação e coffee break', 'input', 'currency', 30, true),
  ('event_expenses', 'event_gifts', 'Brindes', 'Brindes e materiais para participantes', 'input', 'currency', 40, true),
  ('event_expenses', 'event_audiovisual', 'Audiovisual', 'Equipamentos e produção audiovisual', 'input', 'currency', 50, true),
  ('event_expenses', 'event_logistics', 'Custo Logístico', 'Logística, transporte e montagem', 'input', 'currency', 60, true),
  ('event_expenses', 'event_expenses_total', 'Total Despesas de Evento', 'Soma automática', 'subtotal', null, 90, false),

  -- VARIABLE EXPENSES
  ('variable_expenses', 'variable_expenses_total', 'Total Despesas Variáveis', 'Subtotal de despesas variáveis', 'subtotal', null, 10, false),

  -- MARKETING
  ('marketing', 'marketing_digital', 'Marketing Digital', 'Investimento em mídia digital', 'input', 'currency', 10, true),
  ('marketing', 'marketing_regional', 'Marketing Regional', 'Investimento em marketing regional/offline', 'input', 'currency', 20, true),
  ('marketing', 'marketing_total', 'Total Marketing', 'Soma automática', 'subtotal', null, 90, false),

  -- DEFAULT (INADIMPLÊNCIA)
  ('default', 'default_gross', 'Inadimplência Bruta', 'Valor total inadimplente no período', 'input', 'currency', 10, true),
  ('default', 'default_recovery', 'Recuperação de Crédito', 'Valores recuperados de inadimplência anterior', 'input', 'currency', 20, true),
  ('default', 'default_net', 'Inadimplência Líquida', 'Bruta menos recuperação', 'subtotal', null, 90, false),

  -- STRUCTURE
  ('structure', 'people_total', 'Pessoas', 'Custos com pessoal (salários, encargos, benefícios)', 'input', 'currency', 10, true),
  ('structure', 'cto_total', 'CTO', 'Custos de tecnologia e operações', 'input', 'currency', 20, true),
  ('structure', 'utilities_services_total', 'Utilidades e Serviços', 'Serviços terceirizados, utilidades', 'input', 'currency', 30, true),
  ('structure', 'general_expenses_total', 'Despesas Gerais', 'Demais despesas administrativas', 'input', 'currency', 40, true),

  -- TAXES
  ('taxes', 'taxes', 'Impostos', 'Impostos totais do período', 'input', 'currency', 10, true),

  -- RESULT
  ('result', 'mc2', 'Margem de Contribuição 2', 'MC1 menos eventos, variáveis, marketing e inadimplência', 'subtotal', null, 10, false),
  ('result', 'ebitda_1', 'EBITDA 1', 'MC2 menos custos de estrutura', 'subtotal', null, 20, false),
  ('result', 'ebitda_2', 'EBITDA 2', 'EBITDA 1 menos impostos — resultado final', 'subtotal', null, 30, false)
) as x(section_code, code, name, description, line_type, input_mode, display_order, is_editable)
  on s.code = x.section_code
on conflict (code) do nothing;

-- =========================================================
-- EVENT TYPES
-- =========================================================

insert into public.event_types (code, name, description, active) values
  ('cis', 'Método CIS', 'Evento principal do Método CIS', true),
  ('workshop', 'Workshop', 'Workshop temático presencial', true),
  ('treinamento', 'Treinamento', 'Treinamento corporativo ou aberto', true),
  ('imersao', 'Imersão', 'Imersão intensiva', true),
  ('outro', 'Outro', 'Outros tipos de evento', true)
on conflict (code) do nothing;

-- =========================================================
-- VALIDATION RULES (catálogo inicial)
-- =========================================================

insert into public.validation_rules (code, name, description, severity, scope, is_active) values
  ('required_gross_revenue', 'RBV Obrigatória', 'Receita Bruta de Vendas é campo obrigatório', 'blocking', 'input', true),
  ('gross_revenue_positive', 'RBV Positiva', 'Receita Bruta de Vendas deve ser maior que zero', 'blocking', 'input', true),
  ('deductions_not_exceed_revenue', 'Deduções vs RBV', 'Total de deduções não pode exceder a RBV', 'blocking', 'submission', true),
  ('ebitda2_consistency', 'Consistência EBITDA 2', 'EBITDA 2 não pode ser maior que MC1', 'warning', 'submission', true),
  ('marketing_ratio_check', 'Proporção Marketing', 'Marketing acima de 30% da RBV requer justificativa', 'warning', 'submission', true),
  ('taxes_ratio_check', 'Proporção Impostos', 'Impostos acima de 20% da RBV requer revisão', 'warning', 'submission', true),
  ('default_ratio_check', 'Proporção Inadimplência', 'Inadimplência acima de 15% da RBV gera alerta', 'warning', 'submission', true),
  ('duplicate_submission_check', 'Submissão Duplicada', 'Já existe submissão aprovada para este período', 'info', 'period', true),
  ('period_open_check', 'Período Aberto', 'Período deve estar aberto para receber submissões', 'blocking', 'period', true)
on conflict (code) do nothing;

-- =========================================================
-- INITIAL CALCULATION RULE VERSION
-- =========================================================

insert into public.calculation_rule_versions (version_code, description, is_active, effective_from) values
  ('v1.0', 'Regras iniciais da DRE Febracis — baseadas na planilha modelo', true, now())
on conflict (version_code) do nothing;

commit;
