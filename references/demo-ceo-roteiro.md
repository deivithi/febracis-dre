# Roteiro de demo — CEO / diretoria (DRE + assistente)

Duração sugerida: 8–12 minutos. Ambiente: produção ou staging com dados de demo.

## 1. Contexto (1 min)

- Portal consolida **submissão oficial** da DRE por unidade e período; dashboard consome **apenas** versões validadas.
- Assistente é **guia**; números oficiais vêm da grelha + motor após gravar.

## 2. Papel franqueado (3–4 min)

- Login como unidade com permissão de operação.
- Abrir **Assistente** na sidebar (hub com **Dúvidas** / **Começar a DRE**) **ou** **Submissões** → botão **Assistente DRE** (mesmo fluxo; `?submission=` sincroniza o recorte).
- Coligada + competência → rascunho quando necessário.
- Mostrar **preview** RBV / MC1 / MC2 / EBITDA a atualizar com o rascunho.
- No painel do assistente (em **Começar a DRE**): “Olá” → um valor em reais → **Salvar rascunho** e confirmar que totais batem com o painel.

### Modo Dúvidas (rápido)

- No hub **Assistente**, alternar para **Dúvidas**: mensagens **não** gravam valores pelo chat (orientação e glossário).

## 3. Papel leitura (2–3 min)

- Login como **regional** ou perfil sem operação na mesma submissão.
- Confirmar banner **Modo orientação**: explicações sem alterar campos.
- Mensagem off-topic curta (ex.: pedido de piada): ver **realinhamento** e próximo passo sugerido.

## 4. Governança (1–2 min)

- Referir matriz em [`project-context.md`](./project-context.md): `explain_only` vs `full`, RLS por sessão, `flow_checkpoint` para continuidade.
- `viewer`: sem rota de Submissões no menu; URL direta → permissão negada.

## 5. Encerramento

- Enviar para revisão (se aplicável) e mostrar fila no **Workflow** para controladoria.
