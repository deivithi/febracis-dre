# Visao Geral do Sistema

## Objetivo

O Portal Gerencial de Resultado por Franquia organiza a coleta da DRE das unidades, recalcula os indicadores oficiais e entrega a leitura executiva por escopo.

Regra operacional central: a unidade apenas informa os campos editaveis. O sistema calcula automaticamente os subtotais, margens e indicadores oficiais.

## Tese central

O dashboard nao e a origem do dado.

O dado nasce na franquia, passa pela controladoria e so depois sobe para as visoes oficiais de franquia, regional, holding e controladoria.

## Camadas do produto

1. Cadastro e escopo
2. Coleta da DRE
3. Motor de calculo
4. Workflow de revisao
5. Dashboard e auditoria

## Fluxo canonico

1. A franquia escolhe competencia e evento
2. O sistema cria ou reaproveita a versao editavel
3. A unidade preenche apenas os campos liberados
4. O motor recalcula DRE, MC1, MC2, EBITDA 1 e EBITDA 2
5. A unidade salva rascunho ou envia para revisao
6. Depois de enviado, o conteudo fica bloqueado
7. A controladoria aprova ou devolve a mesma versao para ajuste
8. O dashboard consome apenas a saida oficial

## Guardrails atuais

- O dashboard nao pode consumir dado bruto solto.
- A unidade nao pode editar nem reenviar depois de `submitted`, `under_review` ou `approved`.
- A unica reabertura operacional permitida e `pending_adjustment`, quando a controladoria devolve formalmente a mesma versao.
- A DRE segue um modelo canonico de calculo. EBITDA 1 e EBITDA 2 sao sempre derivados do motor, nunca digitados manualmente.

## Resultado esperado

- Padronizacao da coleta financeira
- Reducao de retrabalho
- Governanca por perfil e escopo
- KPI oficial calculado no sistema
- Trilha de historico e auditoria
