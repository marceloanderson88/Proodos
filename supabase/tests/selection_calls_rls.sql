begin;

select plan(8);

select has_table('public', 'selection_calls', 'selection_calls existe');
select has_table('public', 'selection_applications', 'selection_applications existe');
select has_table('public', 'selection_reviews', 'selection_reviews existe');
select has_table('public', 'selection_rankings', 'selection_rankings existe');

select ok(not has_table_privilege('anon', 'public.selection_applications', 'select'), 'anon não consulta inscrições diretamente');
select ok(not has_table_privilege('anon', 'public.selection_reviews', 'select'), 'anon não consulta avaliações');
select ok(has_function_privilege('anon', 'public.get_public_selection_call(text)', 'execute'), 'anon consulta uma chamada somente pela função pública');
select ok(has_function_privilege('anon', 'public.submit_selection_application(text,text,text,text,text,text,text,text,text,text,public.startup_stage,text,jsonb)', 'execute'), 'anon envia inscrição somente pela função validada');

select * from finish();
rollback;
