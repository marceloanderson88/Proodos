begin;

select plan(8);

select has_table('public', 'cerne_cycles', 'ciclos CERNE existem');
select has_table('public', 'cerne_evidences', 'evidências CERNE existem');
select has_table('public', 'cerne_review_assignments', 'atribuições da banca existem');
select has_table('public', 'cerne_drive_folders', 'pastas lógicas do Drive existem');
select ok(not has_table_privilege('anon', 'public.cerne_evidences', 'select'), 'anon não consulta evidências');
select ok(not has_table_privilege('authenticated', 'public.cerne_evidences', 'insert'), 'inserção direta é bloqueada');
select ok(has_function_privilege('authenticated', 'public.register_cerne_evidence(uuid,text,uuid,text,text,text,text,text,uuid,jsonb,text,uuid)', 'execute'), 'usuários autorizados usam a função validada');
select ok(not has_function_privilege('anon', 'public.get_cerne_workspace(uuid,uuid)', 'execute'), 'anon não abre o workspace CERNE');

select * from finish();
rollback;
