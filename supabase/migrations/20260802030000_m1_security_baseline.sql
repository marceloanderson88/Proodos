-- Marco 1: baseline de segurança. Nenhuma tabela de negócio é criada neste marco.
-- Tabelas futuras no schema exposto deverão receber grants explícitos, RLS e policies
-- na mesma migration que as criar.

begin;

revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

commit;
