begin;

-- Índices de cobertura das FKs adicionadas na Fase 2. Postgres não os cria
-- automaticamente e eles também sustentam as consultas usadas pelas policies.
create index if not exists diagnostic_assessments_campaign_fk_idx
  on public.diagnostic_assessments (organization_id, campaign_id);
create index if not exists diagnostic_assessments_campaign_startup_fk_idx
  on public.diagnostic_assessments (organization_id, campaign_startup_id);
create index if not exists diagnostic_campaign_startups_campaign_fk_idx
  on public.diagnostic_campaign_startups (organization_id, campaign_id);
create index if not exists diagnostic_campaign_startups_incubator_fk_idx
  on public.diagnostic_campaign_startups (organization_id, incubator_id);
create index if not exists diagnostic_campaigns_created_by_fk_idx
  on public.diagnostic_campaigns (created_by);
create index if not exists diagnostic_campaigns_default_evaluator_fk_idx
  on public.diagnostic_campaigns (default_evaluator_id) where default_evaluator_id is not null;
create index if not exists diagnostic_campaigns_cohort_fk_idx
  on public.diagnostic_campaigns (organization_id, cohort_id) where cohort_id is not null;
create index if not exists diagnostic_campaigns_template_fk_idx
  on public.diagnostic_campaigns (organization_id, template_id);
create index if not exists diagnostic_classification_ranges_incubator_fk_idx
  on public.diagnostic_classification_ranges (organization_id, incubator_id);
create index if not exists diagnostic_classification_ranges_template_fk_idx
  on public.diagnostic_classification_ranges (organization_id, template_id);
create index if not exists diagnostic_criterion_levels_criterion_fk_idx
  on public.diagnostic_criterion_levels (organization_id, criterion_id);
create index if not exists diagnostic_criterion_levels_incubator_fk_idx
  on public.diagnostic_criterion_levels (organization_id, incubator_id);
create index if not exists diagnostic_criterion_levels_template_fk_idx
  on public.diagnostic_criterion_levels (organization_id, template_id);
create index if not exists diagnostic_criterion_stages_criterion_fk_idx
  on public.diagnostic_criterion_stages (organization_id, criterion_id);
create index if not exists diagnostic_criterion_stages_template_fk_idx
  on public.diagnostic_criterion_stages (organization_id, template_id);
create index if not exists diagnostic_dimension_scores_assessment_fk_idx
  on public.diagnostic_dimension_scores (organization_id, assessment_id);
create index if not exists diagnostic_dimension_scores_dimension_fk_idx
  on public.diagnostic_dimension_scores (organization_id, dimension_id);
create index if not exists diagnostic_dimension_scores_incubator_fk_idx
  on public.diagnostic_dimension_scores (organization_id, incubator_id);
create index if not exists diagnostic_dimension_stages_dimension_fk_idx
  on public.diagnostic_dimension_stages (organization_id, dimension_id);
create index if not exists diagnostic_dimension_stages_template_fk_idx
  on public.diagnostic_dimension_stages (organization_id, template_id);
create index if not exists diagnostic_history_events_actor_fk_idx
  on public.diagnostic_history_events (actor_id) where actor_id is not null;
create index if not exists diagnostic_history_events_assessment_fk_idx
  on public.diagnostic_history_events (organization_id, assessment_id);
create index if not exists diagnostic_history_events_incubator_fk_idx
  on public.diagnostic_history_events (organization_id, incubator_id);
create index if not exists diagnostic_indicator_definitions_incubator_fk_idx
  on public.diagnostic_indicator_definitions (organization_id, incubator_id);
create index if not exists diagnostic_indicator_definitions_template_fk_idx
  on public.diagnostic_indicator_definitions (organization_id, template_id);
create index if not exists diagnostic_indicator_values_assessment_fk_idx
  on public.diagnostic_indicator_values (organization_id, assessment_id);
create index if not exists diagnostic_indicator_values_incubator_fk_idx
  on public.diagnostic_indicator_values (organization_id, incubator_id);
create index if not exists diagnostic_indicator_values_definition_fk_idx
  on public.diagnostic_indicator_values (organization_id, indicator_definition_id);
create index if not exists diagnostic_indicator_values_recorded_by_fk_idx
  on public.diagnostic_indicator_values (recorded_by);
create index if not exists diagnostic_respondents_invited_by_fk_idx
  on public.diagnostic_respondents (invited_by);
create index if not exists diagnostic_respondents_incubator_fk_idx
  on public.diagnostic_respondents (organization_id, incubator_id);
create index if not exists diagnostic_response_evidence_created_by_fk_idx
  on public.diagnostic_response_evidence (created_by);
create index if not exists diagnostic_response_evidence_incubator_fk_idx
  on public.diagnostic_response_evidence (organization_id, incubator_id);
create index if not exists diagnostic_template_families_created_by_fk_idx
  on public.diagnostic_template_families (created_by);
create index if not exists diagnostic_templates_based_on_fk_idx
  on public.diagnostic_templates (based_on_version_id) where based_on_version_id is not null;
create index if not exists diagnostic_templates_family_fk_idx
  on public.diagnostic_templates (organization_id, family_id);
create index if not exists diagnostic_trigger_results_assessment_fk_idx
  on public.diagnostic_trigger_results (organization_id, assessment_id);
create index if not exists diagnostic_trigger_results_incubator_fk_idx
  on public.diagnostic_trigger_results (organization_id, incubator_id);
create index if not exists diagnostic_trigger_results_rule_fk_idx
  on public.diagnostic_trigger_results (organization_id, trigger_rule_id);
create index if not exists diagnostic_trigger_rules_criterion_fk_idx
  on public.diagnostic_trigger_rules (organization_id, criterion_id) where criterion_id is not null;
create index if not exists diagnostic_trigger_rules_incubator_fk_idx
  on public.diagnostic_trigger_rules (organization_id, incubator_id);
create index if not exists diagnostic_trigger_rules_indicator_fk_idx
  on public.diagnostic_trigger_rules (organization_id, indicator_definition_id)
  where indicator_definition_id is not null;
create index if not exists diagnostic_trigger_rules_template_fk_idx
  on public.diagnostic_trigger_rules (organization_id, template_id);

-- Policies FOR ALL também participam de SELECT. Dividi-las por operação evita
-- múltiplas policies permissivas sem reduzir a autorização de leitura.
drop policy if exists diagnostic_template_families_manage on public.diagnostic_template_families;
create policy diagnostic_template_families_insert on public.diagnostic_template_families
for insert to authenticated
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));
create policy diagnostic_template_families_update on public.diagnostic_template_families
for update to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));
create policy diagnostic_template_families_delete on public.diagnostic_template_families
for delete to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'diagnostic_dimension_stages', 'diagnostic_criterion_stages',
    'diagnostic_criterion_levels', 'diagnostic_classification_ranges',
    'diagnostic_indicator_definitions', 'diagnostic_trigger_rules'
  ] loop
    execute format('drop policy if exists %I_manage on public.%I', table_name, table_name);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (exists (select 1 from public.diagnostic_templates t where t.organization_id = %I.organization_id and t.id = %I.template_id and private.has_permission(t.organization_id, ''diagnostic.manage'', null, t.incubator_id)))',
      table_name, table_name, table_name, table_name
    );
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (exists (select 1 from public.diagnostic_templates t where t.organization_id = %I.organization_id and t.id = %I.template_id and private.has_permission(t.organization_id, ''diagnostic.manage'', null, t.incubator_id))) with check (exists (select 1 from public.diagnostic_templates t where t.organization_id = %I.organization_id and t.id = %I.template_id and private.has_permission(t.organization_id, ''diagnostic.manage'', null, t.incubator_id)))',
      table_name, table_name, table_name, table_name, table_name, table_name
    );
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (exists (select 1 from public.diagnostic_templates t where t.organization_id = %I.organization_id and t.id = %I.template_id and private.has_permission(t.organization_id, ''diagnostic.manage'', null, t.incubator_id)))',
      table_name, table_name, table_name, table_name
    );
  end loop;
end $$;

drop policy if exists diagnostic_campaigns_manage on public.diagnostic_campaigns;
create policy diagnostic_campaigns_insert on public.diagnostic_campaigns
for insert to authenticated
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id) and created_by = (select auth.uid()));
create policy diagnostic_campaigns_update on public.diagnostic_campaigns
for update to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));
create policy diagnostic_campaigns_delete on public.diagnostic_campaigns
for delete to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id) and status = 'draft');

drop policy if exists diagnostic_campaign_startups_manage on public.diagnostic_campaign_startups;
create policy diagnostic_campaign_startups_insert on public.diagnostic_campaign_startups
for insert to authenticated
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));
create policy diagnostic_campaign_startups_update on public.diagnostic_campaign_startups
for update to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));
create policy diagnostic_campaign_startups_delete on public.diagnostic_campaign_startups
for delete to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

drop policy if exists diagnostic_respondents_manage on public.diagnostic_respondents;
create policy diagnostic_respondents_insert on public.diagnostic_respondents
for insert to authenticated
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id) and invited_by = (select auth.uid()));
create policy diagnostic_respondents_update on public.diagnostic_respondents
for update to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id))
with check (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));
create policy diagnostic_respondents_delete on public.diagnostic_respondents
for delete to authenticated
using (private.has_permission(organization_id, 'diagnostic.manage', null, incubator_id));

drop policy if exists diagnostic_response_validations_manage on public.diagnostic_response_validations;
create policy diagnostic_response_validations_insert on public.diagnostic_response_validations
for insert to authenticated with check (exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_validations.response_id
    and private.can_validate_diagnostic_assessment(r.assessment_id)
) and validator_id = (select auth.uid()));
create policy diagnostic_response_validations_update on public.diagnostic_response_validations
for update to authenticated
using (exists (
  select 1 from public.diagnostic_responses r
  where r.id = diagnostic_response_validations.response_id
    and private.can_validate_diagnostic_assessment(r.assessment_id)
))
with check (validator_id = (select auth.uid()));
create policy diagnostic_response_validations_delete on public.diagnostic_response_validations
for delete to authenticated
using (status = 'draft' and validator_id = (select auth.uid()));

drop policy if exists diagnostic_indicator_values_manage on public.diagnostic_indicator_values;
create policy diagnostic_indicator_values_insert on public.diagnostic_indicator_values
for insert to authenticated
with check (private.can_respond_diagnostic_assessment(assessment_id) and recorded_by = (select auth.uid()));
create policy diagnostic_indicator_values_update on public.diagnostic_indicator_values
for update to authenticated
using (private.can_respond_diagnostic_assessment(assessment_id))
with check (private.can_respond_diagnostic_assessment(assessment_id) and recorded_by = (select auth.uid()));
create policy diagnostic_indicator_values_delete on public.diagnostic_indicator_values
for delete to authenticated
using (private.can_respond_diagnostic_assessment(assessment_id));

commit;
