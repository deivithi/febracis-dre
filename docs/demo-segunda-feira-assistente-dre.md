# Roteiro de demonstração (~3 minutos) — Assistente DRE

Audiência: coordenadores e gestores. Objetivo: mostrar **governança**, **UX para o franqueado** e **separação entre LLM e motor contábil**.

## 0. Pré-check (antes da reunião)

- Ambiente Vercel com `OPENROUTER_API_KEY` e, se desejado, `OPENROUTER_MODEL=minimax/minimax-m2.7`.
- Sem key: o assistente opera em **modo guiado local** (badge visível no painel).
- Ter uma submissão em rascunho numa franquia de demo.

## 1. Problema (30 s)

- Franqueados com maturidade digital heterogénea precisam enviar a DRE sem erro de campo ou formato.
- EBITDA e MC **não podem** ser “calculados na conversa” — têm de vir do **motor oficial**.

## 2. Experiência guiada (90 s)

1. Mostrar o **assistente em largura total** após os KPIs: barra de progresso, campo em foco e texto **sem códigos técnicos**.
2. Clicar em **Começar** ou enviar um valor em reais; mostrar que o **preview lateral** (MC1, EBITDA 2) reage.
3. Opcional: **Explicar campo** e abrir o `<details>` das referências — discurso: **“base curada + catálogo”**, não RAG vetorial completo até haver ingestão indexada.
4. Mostrar **Abrir editor manual (avançado)** recolhido por defeito: o franqueado não fica obrigado à grelha, mas o financeiro ainda pode.

## 3. Governança (45 s)

- Envio final continua em **Enviar para revisão** no painel lateral.
- O assistente **não substitui** o workflow nem inventa `line_code` (validação no servidor + lista permitida).

## 4. Frase de fecho

> “O modelo orienta e formata a conversa; os números oficiais nascem do mesmo lugar de sempre — o motor da DRE no banco.”
