begin;

create index if not exists diagnostic_respondents_org_assessment_idx
  on public.diagnostic_respondents (organization_id, assessment_id);

commit;
