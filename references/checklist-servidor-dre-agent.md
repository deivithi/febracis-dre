# Checklist — API `dre-agent` e números (pré-demo / pós-deploy)

Usar após alterações em `api/dre-agent.ts`, `dreAssistant.ts` ou permissões.

1. **`npm run build`** e **`npm run test`** na raiz do projeto.
2. **Vercel:** `api/dre-agent` usa `maxDuration: 60` (`vercel.json` + `export const config` em `api/dre-agent.ts`) para reduzir timeouts da plataforma com corpo não-JSON (HTML), que quebrava o cliente ao fazer parse.
3. **Modo `explain_only`:** com utilizador só leitura (ex.: regional) e rascunho aberto, enviar mensagem ao assistente e confirmar que a DRE **não** altera valores (rede/Supabase ou UI).
4. **`fieldUpdates`:** com franqueado em rascunho, pedir um valor monetário claro e confirmar que só linhas do catálogo entram no payload (DevTools → resposta JSON).
5. **Sanitização:** resposta com `lineCode` inventado não deve persistir na planilha (servidor filtra com `validateAssistantFieldUpdates`).
6. **MC/EBITDA:** nenhuma linha da resposta com “MC1/MC2/EBITDA” **e** valor monetário explícito (pós `stripCalculatedMetricClaimsFromAnswer`).
7. **Variáveis Vercel:** `OPENROUTER_API_KEY` definida em produção se quiseres modo LLM; sem chave, fluxo cai em `fallback` local.
