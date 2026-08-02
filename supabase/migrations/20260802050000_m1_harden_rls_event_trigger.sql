-- Marco 1: endurece a função de event trigger já existente no projeto Supabase.
-- Ela habilita RLS automaticamente em novas tabelas do schema public, mas não deve
-- ser exposta como RPC para clientes anônimos ou autenticados.

begin;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

commit;
