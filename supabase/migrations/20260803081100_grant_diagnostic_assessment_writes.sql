begin;

-- GRANT define se o Data API alcança a operação; as policies RLS existentes
-- continuam decidindo qual avaliação/resposta o usuário autenticado pode criar
-- ou alterar. Não há DELETE exposto ao cliente.
grant insert on public.diagnostic_assessments to authenticated;
grant insert, update on public.diagnostic_responses to authenticated;

commit;
