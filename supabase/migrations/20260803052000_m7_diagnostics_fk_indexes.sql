begin;

create index diagnostic_templates_created_by_idx on public.diagnostic_templates (created_by);
create index diagnostic_dimensions_org_template_idx on public.diagnostic_dimensions (organization_id, template_id);
create index diagnostic_dimensions_org_incubator_idx on public.diagnostic_dimensions (organization_id, incubator_id);
create index diagnostic_criteria_org_template_idx on public.diagnostic_criteria (organization_id, template_id);
create index diagnostic_criteria_org_dimension_idx on public.diagnostic_criteria (organization_id, dimension_id);
create index diagnostic_criteria_org_incubator_idx on public.diagnostic_criteria (organization_id, incubator_id);
create index diagnostic_assessments_org_startup_idx on public.diagnostic_assessments (organization_id, startup_id);
create index diagnostic_assessments_org_template_idx on public.diagnostic_assessments (organization_id, template_id);
create index diagnostic_assessments_started_by_idx on public.diagnostic_assessments (started_by);
create index diagnostic_assessments_evaluator_idx on public.diagnostic_assessments (evaluator_id) where evaluator_id is not null;
create index diagnostic_responses_org_assessment_idx on public.diagnostic_responses (organization_id, assessment_id);
create index diagnostic_responses_org_criterion_idx on public.diagnostic_responses (organization_id, criterion_id);
create index diagnostic_responses_org_incubator_idx on public.diagnostic_responses (organization_id, incubator_id);
create index diagnostic_responses_validated_by_idx on public.diagnostic_responses (validated_by) where validated_by is not null;

commit;
