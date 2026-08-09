-- Etapa 6: cobre FKs usadas por RLS, aceite de convites, fila de aprovação e
-- navegação dos diagnósticos. Índices parciais evitam custo para campos nulos.

begin;

create index if not exists diagnostic_assessment_notes_org_assessment_idx
  on public.diagnostic_assessment_notes (organization_id, assessment_id);
create index if not exists diagnostic_assessment_notes_org_incubator_idx
  on public.diagnostic_assessment_notes (organization_id, incubator_id);

create index if not exists diagnostic_respondent_invites_org_assessment_idx
  on public.diagnostic_respondent_invitations (organization_id, assessment_id);
create index if not exists diagnostic_respondent_invites_org_incubator_idx
  on public.diagnostic_respondent_invitations (organization_id, incubator_id);
create index if not exists diagnostic_respondent_invites_created_by_idx
  on public.diagnostic_respondent_invitations (created_by);

create index if not exists startup_applications_applicant_idx
  on public.startup_applications (applicant_user_id, created_at desc);
create index if not exists startup_applications_reviewed_by_idx
  on public.startup_applications (reviewed_by)
  where reviewed_by is not null;
create index if not exists startup_applications_startup_idx
  on public.startup_applications (organization_id, startup_id)
  where startup_id is not null;

create index if not exists startup_onboarding_invites_created_by_idx
  on public.startup_onboarding_invitations (created_by);
create index if not exists startup_onboarding_invites_accepted_startup_idx
  on public.startup_onboarding_invitations (organization_id, accepted_startup_id)
  where accepted_startup_id is not null;
create index if not exists startup_onboarding_invites_cohort_idx
  on public.startup_onboarding_invitations (organization_id, cohort_id)
  where cohort_id is not null;
create index if not exists startup_onboarding_invites_startup_idx
  on public.startup_onboarding_invitations (organization_id, startup_id)
  where startup_id is not null;

commit;
