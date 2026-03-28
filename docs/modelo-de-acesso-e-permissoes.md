# Modelo de Acesso e Permissoes

## Regra principal

O papel define o que a pessoa pode fazer.

O escopo define onde ela pode fazer.

Para esta fase, o codigo operacional da coligada e o campo `franchises.code`.

## Perfis

### System admin

- Configura usuarios
- Define papeis e escopos
- Prepara e zera ambiente demo
- Opera qualquer modulo

### Finance controller

- Consulta dashboards
- Assume revisao
- Aprova ou devolve submissao
- Consulta auditoria
- E o unico perfil que pode devolver uma versao para `pending_adjustment`

### Regional manager

- Enxerga apenas a regional vinculada
- Compara franquias da carteira
- Consulta as submissões da carteira em modo leitura

### Franchise user

- Enxerga apenas a propria unidade / coligada vinculada
- Preenche a DRE da unidade
- Salva rascunho
- Envia para revisao
- Depois do envio, entra em modo leitura ate haver devolucao formal para ajuste

### Viewer

- Entra em modo leitura
- Nao altera DRE
- Nao altera workflow

## Regra tecnica

O produto usa perfil + escopo + RLS para isolar a visualizacao e a operacao por unidade, regional ou rede.

Na tela `Configuracoes`, o admin escolhe a unidade pelo codigo da coligada. Depois disso, o backend continua aplicando o isolamento real por `franchise_id`.

O diretorio administrativo deve exibir a coligada e a regional efetivas do usuario para evitar liberacao ambigua.

## Trava de submissao

- `draft`, `reopened` e `pending_adjustment` sao os unicos status editaveis pela unidade.
- `submitted`, `under_review` e `approved` ficam bloqueados para edicao, reenvio e criacao de nova versao pela franquia.
- O desbloqueio operacional acontece apenas quando a controladoria devolve a mesma versao para ajuste.
