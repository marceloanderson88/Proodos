# Marco 4 — Fundação de arquivos grandes

## Resultado

O Marco 4 foi concluído em 02/08/2026 no limite previsto: metadados, contratos, RLS, estados, fake, rotas inativas e painel de configuração. Nenhum upload real, SDK Google ou credencial foi introduzido.

## Domínio e serviço

- `LargeFileStorageService` define criação de sessão, conclusão, acesso autorizado, lixeira, restauração e reconciliação.
- `FakeLargeFileStorageService` cobre o contrato sem rede e nunca é importado pelas rotas de produção.
- Zod valida nome, MIME, tamanho seguro, classificação, escopo, idempotência e metadados finais.
- A máquina de estados impede atalhos como `pending -> available` e torna `purged` terminal.

## Banco e migration

`20260802143754_m4_file_metadata_foundation.sql` criou:

- `files`: registro lógico, escopo tipado, classificação, metadados esperados/finais e estado;
- `file_versions`: versões físicas e checksums;
- `file_links`: vínculos com organização, unidade ou incubadora, sem FK polimórfica;
- `file_access_logs`: auditoria append-only reservada ao backend;
- `upload_sessions`: idempotência, offset, expiração e hash de correlação sem URL;
- permissões `file.read`, `file.manage` e `file.audit` e distribuição aos papéis existentes/futuros.

`20260802144151_m4_tighten_file_visibility.sql` registrou o hardening encontrado na revisão: versões e vínculos de estados internos agora exigem `file.manage`, e logs sem `file_id` resolvido podem ser consultados apenas por auditor do tenant.

A CLI do Supabase 2.111.0 voltou a apresentar `LegacyMigrationNewWriteError` no diretório OneDrive existente. Os arquivos foram criados com nomes versionados explícitos e aplicados pelo gerenciador de migrations do Supabase; o problema é operacional, não de SQL.

## RLS e segurança

- `anon` não possui grants.
- `files`: `available` exige `file.read`; demais estados exigem `file.manage`.
- inserção lógica inicia obrigatoriamente em `pending` e exige autor igual a `auth.uid()`.
- o navegador não pode alterar estado, IDs do provedor, tamanho confirmado ou versão atual.
- versões e logs não têm grants de escrita para `authenticated`.
- links exigem `file.manage` no arquivo e no destino tipado.
- sessões são visíveis apenas a quem possui `file.manage`; não podem ser criadas diretamente pelo cliente.
- FKs compostas bloqueiam qualquer vínculo cross-tenant.
- URLs, tokens e credenciais não são persistidos nem logados.

## Rotas e feature flag

- `POST /api/v1/files/upload-session`
- `POST /api/v1/files/{id}/complete`
- `GET /api/v1/files/{id}/access`

As rotas autenticam, validam Zod e resolvem organização/arquivo sob RLS. Com `GOOGLE_DRIVE_UPLOAD_ENABLED=false`, retornam `503` sem mutar o banco. Se a flag for ativada antes do adapter, retornam `501`; portanto, uma configuração acidental não simula sucesso.

## Interface

A página Configurações mostra a arquitetura de armazenamento, estado real da flag e quantidade real de arquivos visíveis. O botão de upload está desabilitado e explica o gate. O placeholder de Conteúdos explicita que conteúdos integrarão trilhas e ações do plano.

## Testes e advisors

- `m4_file_metadata_rls.sql`: passou, incluindo tenant A/B, FK cruzada, grants, estado, leitor versus gestor, versões, vínculos e sessões.
- Regressão M3 e cobertura global de RLS: passaram.
- Vitest: 8 arquivos e 23 testes passaram na verificação final.
- Advisors: nenhuma FK sem índice e nenhum alerta novo de RLS; permanecem apenas avisos intencionais/externos já documentados e índices ainda sem uso por baixa carga.
- Prettier, ESLint, TypeScript strict e build de produção do Next.js: passaram na verificação final.

## Limitações e gates

- B-03: Shared Drive, ambientes e conta de serviço ainda não confirmados.
- B-04: tamanho, MIME, antivírus, retenção, purge e portabilidade ainda não aprovados.
- Não existe criação real de sessão, envio, preview, download, lixeira, restauração ou job de reconciliação.
- Nenhuma URL temporária é retornada.
- A flag deve permanecer falsa na Vercel.

## Próximo marco

O Marco 5 deve adicionar CI, smoke tests autenticados, headers/CSP, revisão de bundle e secrets, health/readiness e runbook de deploy. O spike Google Drive deve ser tratado separadamente quando B-03/B-04 forem respondidos.
