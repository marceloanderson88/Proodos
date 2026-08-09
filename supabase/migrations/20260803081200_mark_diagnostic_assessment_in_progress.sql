begin;

create or replace function public.mark_diagnostic_assessment_in_progress(
  target_assessment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  assessment public.diagnostic_assessments%rowtype;
begin
  select * into assessment
  from public.diagnostic_assessments a
  where a.id = target_assessment_id
  for update;

  if not found or not private.can_respond_diagnostic_assessment(target_assessment_id) then
    raise exception 'Avaliação inexistente ou sem permissão' using errcode = '42501';
  end if;

  if assessment.status = 'draft' then
    update public.diagnostic_assessments
    set status = 'in_progress', lock_version = lock_version + 1
    where id = assessment.id;

    update public.diagnostic_campaign_startups
    set status = 'in_progress'
    where id = assessment.campaign_startup_id
      and status in ('invited', 'not_started');

    insert into public.diagnostic_history_events (
      organization_id, incubator_id, assessment_id, event_type, actor_id,
      from_status, to_status
    ) values (
      assessment.organization_id, assessment.incubator_id, assessment.id,
      'assessment_started', auth.uid(), 'draft', 'in_progress'
    );
  end if;
end;
$$;

revoke execute on function public.mark_diagnostic_assessment_in_progress(uuid)
  from public, anon;
grant execute on function public.mark_diagnostic_assessment_in_progress(uuid)
  to authenticated;

comment on function public.mark_diagnostic_assessment_in_progress(uuid) is
  'Registra de forma restrita o primeiro preenchimento, sem expor UPDATE amplo da avaliação.';

commit;
