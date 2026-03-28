# Logica da DRE e do Workflow

## Fluxo operacional

1. A franquia escolhe competencia e evento
2. O sistema cria ou reaproveita a versao corrente da submissao
3. A unidade preenche somente as linhas editaveis
4. O sistema recalcula DRE e KPIs
5. A unidade salva rascunho e envia
6. A submissao enviada fica bloqueada para edicao e reenvio
7. A controladoria revisa
8. A submissao e aprovada ou devolvida
9. Se a controladoria devolver, a mesma versao volta para ajuste
10. O dashboard consome a saida oficial

## Formulas principais

- deductions_total = soma de todas as deducoes
- mc1 = gross_revenue - deductions_total
- event_expenses_total = treinador + espaco + decoracao + alimentacao + brindes + audiovisual + logistica
- variable_expenses_total = taxas com cartao + logistica variavel + locacao de sala
- marketing_total = marketing_digital + brindes_marketing + marketing_regional + marketing_offline
- default_net = default_gross - default_recovery
- mc2 = mc1 - event_expenses_total - variable_expenses_total - marketing_total - default_net
- ebitda_1 = mc2 - people - cto - utilities_services - general_expenses
- ebitda_2 = ebitda_1 - taxes

## Definicao gerencial de EBITDA

- O produto usa uma definicao gerencial explicita de EBITDA, alinhada ao modelo interno da DRE Febracis.
- A referencia oficial de mercado mostra que EBITDA nao tem definicao universal unica em IFRS e deve ser claramente descrito quando usado como medida gerencial.
- Neste projeto, EBITDA 1 e EBITDA 2 sao sempre derivados da cadeia acima e nunca digitados manualmente.

## Observacao sobre a planilha-base

- A planilha `Modelo DRE Gerencial.xlsx` continua sendo a referencia funcional do fluxo.
- Na leitura tecnica de 2026-03-28, foram encontrados desvios de formula em linhas especificas da amostra Excel.
- Por isso, o sistema segue a semantica canonica da DRE e nao replica cegamente qualquer celula inconsistente da planilha.

## Regras do workflow

- Draft: versao em preparacao
- Submitted: enviada pela unidade
- Under review: assumida pela controladoria
- Pending adjustment: devolvida para ajuste
- Approved: validada como oficial

## Trava de governanca

- Depois de `submitted`, a unidade nao pode editar, reenviar ou criar nova versao por conta propria.
- A unica excecao operacional e `pending_adjustment`, quando a controladoria devolve formalmente a mesma versao para correcoes.

## Regra de governanca

Nenhum dashboard deve consumir dado bruto solto.

O dashboard so deve consumir submissao oficial, DRE calculada e KPIs consolidados.
