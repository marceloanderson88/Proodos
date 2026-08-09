begin;

-- A permissão diagnostic.respond habilita a capacidade geral, mas o contexto
-- da aplicação define quem pode exercê-la: startup no autodiagnóstico e pessoa
-- designada/equipe habilitada na aplicação assistida.
create or replace function private.enforce_diagnostic_response_field_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
  may_respond boolean;
  may_validate boolean;
  self_fields_changed boolean;
  validation_fields_changed boolean;
begin
  select a.* into assessment
  from public.diagnostic_assessments a
  where a.organization_id = new.organization_id
    and a.id = new.assessment_id;

  if not found then
    raise exception 'Aplicação de diagnóstico inexistente' using errcode = '23503';
  end if;

  may_respond := private.can_respond_diagnostic_assessment(assessment.id);
  may_validate := private.has_permission(
    assessment.organization_id,
    'diagnostic.validate',
    null,
    assessment.incubator_id
  );

  if tg_op = 'INSERT' then
    self_fields_changed :=
      new.self_value is not null
      or new.is_not_applicable
      or new.not_applicable_justification is not null
      or new.evidence_notes <> ''
      or new.self_comment <> '';
    validation_fields_changed :=
      new.validated_value is not null
      or new.evaluator_comment <> ''
      or new.validated_by is not null
      or new.validated_at is not null;
  else
    self_fields_changed :=
      (new.self_value, new.is_not_applicable, new.not_applicable_justification,
       new.evidence_notes, new.self_comment)
      is distinct from
      (old.self_value, old.is_not_applicable, old.not_applicable_justification,
       old.evidence_notes, old.self_comment);
    validation_fields_changed :=
      (new.validated_value, new.evaluator_comment, new.validated_by, new.validated_at)
      is distinct from
      (old.validated_value, old.evaluator_comment, old.validated_by, old.validated_at);
  end if;

  if self_fields_changed and not may_respond then
    raise exception 'Você não pode responder este diagnóstico'
      using errcode = '42501';
  end if;

  if validation_fields_changed and not may_validate then
    raise exception 'A validação exige a permissão diagnostic.validate'
      using errcode = '42501';
  end if;

  if validation_fields_changed
    and new.validated_by is distinct from (select auth.uid()) then
    raise exception 'O avaliador registrado deve ser o usuário autenticado'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_diagnostic_response_field_permissions()
  from public, anon, authenticated;

comment on function private.enforce_diagnostic_response_field_permissions() is
  'Separa campos técnicos e oficiais respeitando o modo e os vínculos da aplicação.';

commit;
