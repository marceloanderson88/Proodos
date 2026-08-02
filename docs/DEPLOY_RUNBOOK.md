# Runbook de deploy

## 1. Objetivo

Publicar o Proodos sem misturar ambientes, expor segredos ou depender de rollback destrutivo do banco. O deploy da aplicação e a aplicação de migrations são operações separadas e verificáveis.

## 2. Matriz de ambientes

| Ambiente | `VERCEL_ENV` | `NEXT_PUBLIC_APP_ENV`   | Supabase               | Dados                  |
| -------- | ------------ | ----------------------- | ---------------------- | ---------------------- |
| Local/CI | ausente      | `development` ou `test` | CLI local              | sintéticos             |
| Preview  | `preview`    | `staging`               | projeto de homologação | sintéticos/homologação |
| Produção | `production` | `production`            | projeto de produção    | reais                  |

O build bloqueia Preview quando:

- `NEXT_PUBLIC_APP_ENV` não é `staging`;
- `PRODUCTION_SUPABASE_PROJECT_REF` não foi informado;
- a URL Supabase do Preview usa o mesmo project ref de produção.

## 3. Variáveis Vercel

### Produção

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_ENV=production`
- `APP_BASE_URL=https://proodos.vercel.app`
- `GOOGLE_DRIVE_UPLOAD_ENABLED=false` até B-03/B-04.

### Preview

- URL e publishable key de um projeto Supabase exclusivo de homologação;
- `NEXT_PUBLIC_APP_ENV=staging`;
- `PRODUCTION_SUPABASE_PROJECT_REF=ceofkwnhtwjwadqghwxd`;
- `APP_BASE_URL` apontando para domínio estável de homologação;
- `GOOGLE_DRIVE_UPLOAD_ENABLED=false`.

Nunca configurar secret/service role com prefixo `NEXT_PUBLIC_`. Credenciais E2E sintéticas são apenas do seed local e não entram na Vercel.

## 4. Pipeline obrigatório

O workflow `.github/workflows/ci.yml` executa:

1. checkout e instalação congelada com Node 22/pnpm 11.9;
2. scan de segredos no repositório;
3. Supabase local mínimo;
4. reset completo usando todas as migrations e seed;
5. provisionamento de senha sintética pela Auth Admin API local, com chave administrativa restrita ao processo;
6. formatter, lint e TypeScript strict;
7. unitários e pgTAP/RLS;
8. build de produção e scan do bundle;
9. smoke autenticado, tenant cruzado, health/readiness e acessibilidade.

Qualquer falha bloqueia o job. GitHub Actions de terceiros estão fixadas por SHA.

O stack local usa `ANON_KEY`/`SERVICE_ROLE_KEY` efêmeras fornecidas pelo próprio CLI e valida o login antes do navegador. Isso não altera o uso da chave publicável moderna nos ambientes hospedados.

## 5. Aplicação de migrations

1. Confirmar que os nomes locais correspondem a `supabase_migrations.schema_migrations`.
2. Validar reset e pgTAP em ambiente limpo.
3. Fazer backup lógico/confirmar PITR conforme o plano contratado.
4. Aplicar migrations pendentes primeiro em homologação.
5. Executar advisors e smoke de readiness.
6. Aplicar em produção numa janela controlada.
7. Não reverter migration destrutivamente para desfazer aplicação; fazer rollback do app ou migration corretiva forward-only.

O Marco 5 alinhou as versões M1–M5 locais ao histórico remoto. A migration `m5_system_readiness` foi aplicada e verificada em produção antes da publicação do endpoint `/api/ready`.

## 6. Deploy da aplicação

1. Confirmar CI verde.
2. Confirmar migrations compatíveis com a versão a publicar.
3. Publicar via integração GitHub/Vercel.
4. Verificar `/api/health` (processo web) e `/api/ready` (Data API/Postgres).
5. Executar login, resolução de `/o`, dashboard e logout com conta de teste autorizada.
6. Conferir logs pelo `x-request-id`, sem registrar cookies, tokens, payloads sensíveis ou URLs de upload.

## 7. Rollback e incidente

- Falha só na aplicação: promover o deployment Vercel anterior.
- Falha de readiness: não promover; verificar variáveis, grants da RPC e disponibilidade Supabase.
- Falha após migration aditiva: manter schema e reverter apenas o app se a versão anterior for compatível.
- Vazamento de segredo: revogar/rotacionar imediatamente, retirar deployment, revisar logs e abrir registro de incidente.
- Suspeita cross-tenant: bloquear operação afetada, preservar auditoria e tratar como incidente crítico.

## 8. Limitações aceitas

- O limitador de rajadas da aplicação é por instância serverless; rate limiting distribuído exige infraestrutura compartilhada antes do piloto.
- A CSP ainda permite `unsafe-inline` para scripts/estilos necessários ao runtime Next.js; nonce estrito permanece hardening posterior.
- SMTP, proteção de senha vazada, MFA administrativo, Sentry/alertas e staging Supabase são configurações externas pendentes.
