-- Marco 1: endurece a função de event trigger já existente no projeto Supabase.
-- Versão alinhada ao histórico remoto no Marco 5.
-- Ela habilita RLS automaticamente em novas tabelas do schema public, mas não deve
-- ser exposta como RPC para clientes anônimos ou autenticados.
-- Em bancos reconstruídos do zero, a função pode não existir porque foi criada
-- originalmente no projeto remoto antes do histórico versionado. Nesse caso,
-- esta migration não tem nenhum privilégio a revogar.

begin;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public';
    execute 'revoke execute on function public.rls_auto_enable() from anon';
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;
end
$$;

commit;
