# Matriz manual de testes RLS — `public.notifications`

Após aplicar `020_create_notifications.sql`, validar no SQL Editor (ou cliente) com **dois utilizadores** (A e B), sessões JWT distintas.

| Caso | Utilizador | Ação | Resultado esperado |
|------|------------|------|---------------------|
| S1 | A | `select * from notifications where user_id = A` | Apenas linhas de A |
| S2 | B | Idem para B | Apenas linhas de B |
| S3 | A | `select * from notifications where user_id = B` | **0 linhas** (RLS filtra) |
| U1 | A | `update notifications set read_at = now() where id = …` de uma linha **de B** | **0 linhas** afetadas ou erro de política |
| U2 | A | `update notifications set read_at = now() where id = …` de uma linha **de A** | OK |
| D1 | A | `delete from notifications where id = …` de linha de B | **0 linhas** |
| I1 | A | `insert into notifications (user_id, type, payload) values (A::uuid, 'approval_pending', '{}')` | **Negado** (sem política INSERT para `authenticated`) |
| I2 | service_role | Inserção só via `notification_enqueue` ou trigger em ambiente com permissão | Conforme desenho |

**Realtime:** no Dashboard Supabase, confirmar que a tabela `notifications` está na publicação `supabase_realtime` e que **Realtime** está ativo para o projeto. Se `ALTER PUBLICATION` falhar na migração, siga as instruções da consola ou adicione a tabela manualmente.

**STOP-AND-CALL:** conflitos de política com outros roles; trigger a falhar por colunas em falta; Realtime desativado no projeto.
