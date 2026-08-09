begin;

-- Papéis operacionais podem responder ou gerenciar o fluxo, mas não devem
-- adquirir validação oficial por resíduos de seeds anteriores. A separação
-- permanece: avaliador e gestor validam; agente e coordenador executam.
delete from public.role_permissions rp
using public.roles r
where r.organization_id = rp.organization_id
  and r.id = rp.role_id
  and r.code in ('agent', 'program_coordinator', 'mentor')
  and rp.permission_code = 'diagnostic.validate';

commit;
