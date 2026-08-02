-- Dependência exclusiva da suíte local de testes de banco.
-- O prefixo 000 garante que o pgTAP esteja disponível antes dos demais arquivos.

create extension if not exists pgtap with schema extensions;

begin;

select plan(1);
select pass('pgTAP disponível para os testes de integração e RLS');
select * from finish();

rollback;
