# Visão geral do sistema — DRE Brasil (Febracis)

## Objetivo

O **Portal gerencial de resultado por franquia** organiza a coleta da DRE das unidades no Brasil, recalcula os indicadores oficiais e entrega leitura executiva por escopo (franquia, regional, holding, controladoria).

Regra operacional central: a unidade informa apenas os **campos editáveis**. O sistema calcula subtotais, margens e indicadores oficiais de forma automática.

## Tese central

O **dashboard não é a origem do dado**.

O dado nasce na franquia, passa pela controladoria e só depois sobe para as visões oficiais de franquia, regional, holding e controladoria.

## Camadas do produto

1. Cadastro e escopo
2. Coleta da DRE (planilha + **assistente guiado** na mesma jornada)
3. Motor de cálculo
4. Workflow de revisão
5. Dashboard e auditoria

## Fluxo canônico

1. A franquia escolhe competência e evento
2. O sistema cria ou reaproveita a versão editável
3. A unidade preenche apenas os campos liberados (diretamente ou com apoio do assistente)
4. O motor recalcula DRE, MC1, MC2, EBITDA 1 e EBITDA 2
5. A unidade salva rascunho ou envia para revisão
6. Depois de enviado, o conteúdo fica bloqueado para edição pela franquia
7. A controladoria aprova ou devolve a mesma versão para ajuste
8. O dashboard consome apenas a saída oficial

## Guardrails atuais

- O dashboard não pode consumir dado bruto solto.
- A unidade não pode editar nem reenviar depois de `submitted`, `under_review` ou `approved`.
- A única reabertura operacional permitida é `pending_adjustment`, quando a controladoria devolve formalmente a mesma versão.
- A DRE segue um modelo canônico de cálculo. EBITDA 1 e EBITDA 2 são sempre derivados do motor, nunca digitados manualmente.

## Resultado esperado

- Padronização da coleta financeira
- Menos retrabalho
- Governança por perfil e escopo
- KPI oficial calculado no sistema
- Trilha de histórico e auditoria
