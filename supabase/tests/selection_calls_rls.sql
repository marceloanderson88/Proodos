begin;

select plan(12);

select has_table('public', 'selection_calls', 'selection_calls existe');
select has_table('public', 'selection_applications', 'selection_applications existe');
select has_table('public', 'selection_reviews', 'selection_reviews existe');
select has_table('public', 'selection_rankings', 'selection_rankings existe');

select ok(not has_table_privilege('anon', 'public.selection_applications', 'select'), 'anon não consulta inscrições diretamente');
select ok(not has_table_privilege('anon', 'public.selection_reviews', 'select'), 'anon não consulta avaliações');
select ok(has_function_privilege('anon', 'public.get_public_selection_call(text)', 'execute'), 'anon consulta uma chamada somente pela função pública');
select ok(not has_function_privilege('anon', 'public.submit_selection_application(text,text,text,text,text,text,text,text,text,text,public.startup_stage,text,jsonb)', 'execute'), 'a assinatura pública antiga não pode contornar a proteção do servidor');
select ok(not has_function_privilege('anon', 'public.submit_selection_application(text,text,text,text,text,text,text,text,text,text,public.startup_stage,text,jsonb,text,uuid)', 'execute'), 'anon não executa diretamente o envio protegido');
select ok(has_function_privilege('service_role', 'public.submit_selection_application(text,text,text,text,text,text,text,text,text,text,public.startup_stage,text,jsonb,text,uuid)', 'execute'), 'o servidor executa o envio protegido');
select ok(not has_function_privilege('anon', 'public.submit_public_selection_appeal(text,text,text,text,text)', 'execute'), 'anon não executa diretamente o recurso protegido');
select ok(has_function_privilege('service_role', 'public.respond_selection_convocation(text,text,text,boolean,text)', 'execute'), 'o servidor executa a resposta protegida da convocação');

select * from finish();
rollback;
