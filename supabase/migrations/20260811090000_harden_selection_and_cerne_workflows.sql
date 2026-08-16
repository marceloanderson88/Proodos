begin;

-- Public write flows are executed only by the server. This private table provides
-- a distributed limiter shared by all application instances.
create table if not exists private.public_action_rate_limits (
  action_key text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  hit_count integer not null,
  updated_at timestamptz not null default now(),
  primary key (action_key, subject_hash),
  constraint public_action_rate_limits_action_valid
    check (char_length(action_key) between 3 and 200),
  constraint public_action_rate_limits_hash_valid
    check (subject_hash ~ '^[0-9a-f]{64}$'),
  constraint public_action_rate_limits_hits_valid
    check (hit_count > 0)
);

alter table private.public_action_rate_limits enable row level security;
revoke all on private.public_action_rate_limits from public, anon, authenticated;

create or replace function private.consume_public_action_rate_limit(
  target_action text,
  subject text,
  maximum_hits integer,
  window_duration interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_hits integer;
  current_window timestamptz;
  now_at timestamptz := clock_timestamp();
  hashed_subject text;
begin
  if char_length(btrim(coalesce(target_action, ''))) not between 3 and 200
    or char_length(coalesce(subject, '')) not between 1 and 1000
    or maximum_hits not between 1 and 10000
    or window_duration <= interval '0 seconds'
    or window_duration > interval '30 days'
  then
    raise exception 'Política de limite inválida' using errcode = '22023';
  end if;

  hashed_subject := encode(extensions.digest(subject, 'sha256'), 'hex');

  insert into private.public_action_rate_limits (
    action_key, subject_hash, window_started_at, hit_count, updated_at
  ) values (
    btrim(target_action), hashed_subject, now_at, 1, now_at
  )
  on conflict (action_key, subject_hash) do update set
    window_started_at = case
      when private.public_action_rate_limits.window_started_at <= now_at - window_duration
        then now_at
      else private.public_action_rate_limits.window_started_at
    end,
    hit_count = case
      when private.public_action_rate_limits.window_started_at <= now_at - window_duration
        then 1
      else private.public_action_rate_limits.hit_count + 1
    end,
    updated_at = now_at
  returning hit_count, window_started_at
  into current_hits, current_window;

  if current_hits > maximum_hits then
    raise exception 'Muitas tentativas. Aguarde antes de tentar novamente.'
      using errcode = 'P0001',
            detail = 'RATE_LIMITED',
            hint = greatest(1, ceil(extract(epoch from (current_window + window_duration - now_at))))::text;
  end if;
end;
$$;

revoke all on function private.consume_public_action_rate_limit(text, text, integer, interval)
  from public, anon, authenticated;

create or replace function private.validate_selection_answer(
  question public.selection_questions,
  supplied_answer jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_type text := jsonb_typeof(supplied_answer);
  answer_text text := supplied_answer #>> '{}';
  numeric_value numeric;
  option_count integer;
begin
  if supplied_answer is null or answer_type = 'null' then
    if question.required then
      raise exception 'Campo obrigatório: %', question.label using errcode = '22023';
    end if;
    return;
  end if;

  if question.kind in ('short_text', 'long_text', 'url', 'date', 'single_choice') then
    if answer_type <> 'string' then
      raise exception 'Formato inválido: %', question.label using errcode = '22023';
    end if;
    if question.required and char_length(btrim(coalesce(answer_text, ''))) = 0 then
      raise exception 'Campo obrigatório: %', question.label using errcode = '22023';
    end if;
  end if;

  case question.kind
    when 'short_text' then
      if char_length(answer_text) > 500 then
        raise exception 'Resposta muito longa: %', question.label using errcode = '22023';
      end if;
    when 'long_text' then
      if char_length(answer_text) > 10000 then
        raise exception 'Resposta muito longa: %', question.label using errcode = '22023';
      end if;
    when 'url' then
      if answer_text <> '' and (
        char_length(answer_text) > 2048
        or answer_text !~* '^https?://[^[:space:]]+$'
      ) then
        raise exception 'URL inválida: %', question.label using errcode = '22023';
      end if;
    when 'date' then
      if answer_text <> '' then
        if answer_text !~ '^\d{4}-\d{2}-\d{2}$' then
          raise exception 'Data inválida: %', question.label using errcode = '22023';
        end if;
        begin
          perform answer_text::date;
        exception when others then
          raise exception 'Data inválida: %', question.label using errcode = '22023';
        end;
      end if;
    when 'number' then
      if answer_type not in ('number', 'string')
        or char_length(coalesce(answer_text, '')) > 100
        or answer_text !~ '^-?[0-9]+([.][0-9]+)?$'
      then
        raise exception 'Número inválido: %', question.label using errcode = '22023';
      end if;
      begin
        numeric_value := answer_text::numeric;
      exception when others then
        raise exception 'Número inválido: %', question.label using errcode = '22023';
      end;
      if question.validation ? 'min' and numeric_value < (question.validation ->> 'min')::numeric then
        raise exception 'Valor abaixo do mínimo: %', question.label using errcode = '22023';
      end if;
      if question.validation ? 'max' and numeric_value > (question.validation ->> 'max')::numeric then
        raise exception 'Valor acima do máximo: %', question.label using errcode = '22023';
      end if;
    when 'boolean' then
      if answer_type <> 'boolean'
        and not (answer_type = 'string' and answer_text in ('true', 'false'))
      then
        raise exception 'Resposta booleana inválida: %', question.label using errcode = '22023';
      end if;
    when 'single_choice' then
      if answer_text <> '' and not exists (
        select 1
        from jsonb_array_elements_text(question.options) as allowed(value)
        where allowed.value = answer_text
      ) then
        raise exception 'Opção inválida: %', question.label using errcode = '22023';
      end if;
    when 'multiple_choice' then
      if answer_type <> 'array' then
        raise exception 'Formato inválido: %', question.label using errcode = '22023';
      end if;
      option_count := jsonb_array_length(supplied_answer);
      if question.required and option_count = 0 then
        raise exception 'Campo obrigatório: %', question.label using errcode = '22023';
      end if;
      if option_count > 100 or exists (
        select 1
        from jsonb_array_elements(supplied_answer) as selected(value)
        where jsonb_typeof(selected.value) <> 'string'
          or not exists (
            select 1
            from jsonb_array_elements_text(question.options) as allowed(value)
            where allowed.value = (selected.value #>> '{}')
          )
      ) then
        raise exception 'Opção inválida: %', question.label using errcode = '22023';
      end if;
    else
      raise exception 'Tipo de pergunta inválido' using errcode = '22023';
  end case;
end;
$$;

revoke all on function private.validate_selection_answer(public.selection_questions, jsonb)
  from public, anon, authenticated;

-- Keep the original RPC unavailable so public callers cannot bypass the server
-- fingerprint and the shared rate limiter.
revoke all on function public.submit_selection_application(
  text, text, text, text, text, text, text, text, text, text,
  public.startup_stage, text, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.submit_selection_application(
  call_slug text,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  startup_name text,
  legal_name text,
  tax_id text,
  city text,
  state text,
  sector text,
  stage public.startup_stage,
  summary text,
  answers jsonb,
  request_fingerprint text,
  authenticated_applicant_user_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_call public.selection_calls%rowtype;
  form_id uuid;
  application_id uuid;
  generated_protocol text;
  question public.selection_questions%rowtype;
  normalized_email text := lower(btrim(applicant_email));
begin
  if request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Requisição inválida' using errcode = '22023';
  end if;

  perform private.consume_public_action_rate_limit(
    'selection.application.ip:' || lower(left(btrim(coalesce(call_slug, '')), 120)),
    request_fingerprint,
    20,
    interval '1 hour'
  );

  select * into selected_call
  from public.selection_calls
  where lower(slug) = lower(btrim(call_slug))
  for update;

  if not found
    or selected_call.status not in ('published', 'applications_open')
    or now() not between selected_call.applications_open_at and selected_call.applications_close_at
  then
    raise exception 'Inscrições encerradas' using errcode = '22023';
  end if;

  perform private.consume_public_action_rate_limit(
    'selection.application.email:' || selected_call.id::text,
    normalized_email,
    5,
    interval '1 day'
  );

  if coalesce(char_length(btrim(applicant_name)), 0) not between 2 and 160
    or coalesce(char_length(normalized_email), 0) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(char_length(btrim(startup_name)), 0) not between 2 and 160
    or char_length(btrim(coalesce(applicant_phone, ''))) > 40
    or char_length(btrim(coalesce(legal_name, ''))) > 200
    or char_length(btrim(coalesce(tax_id, ''))) > 32
    or char_length(btrim(coalesce(city, ''))) > 120
    or char_length(btrim(coalesce(state, ''))) > 120
    or char_length(btrim(coalesce(sector, ''))) > 120
    or char_length(btrim(coalesce(summary, ''))) > 3000
  then
    raise exception 'Dados da inscrição inválidos' using errcode = '22023';
  end if;

  if authenticated_applicant_user_id is not null and not exists (
    select 1 from auth.users u
    where u.id = authenticated_applicant_user_id
      and lower(u.email) = normalized_email
      and u.email_confirmed_at is not null
  ) then
    raise exception 'Identidade do responsável inválida' using errcode = '42501';
  end if;

  select id into form_id
  from public.selection_form_versions
  where call_id = selected_call.id and published_at is not null
  order by version desc
  limit 1;

  if form_id is null then
    raise exception 'Formulário da chamada indisponível' using errcode = '23514';
  end if;

  if jsonb_typeof(answers) <> 'object'
    or pg_column_size(answers) > 262144
    or (select count(*) from jsonb_object_keys(answers)) > 100
    or exists (
      select 1
      from jsonb_object_keys(answers) as supplied(code)
      where not exists (
        select 1 from public.selection_questions q
        where q.form_version_id = form_id and q.code = supplied.code
      )
    )
  then
    raise exception 'Respostas inválidas' using errcode = '22023';
  end if;

  for question in
    select q.* from public.selection_questions q
    where q.form_version_id = form_id
    order by q.position
  loop
    if not answers ? question.code then
      if question.required then
        raise exception 'Campo obrigatório: %', question.label using errcode = '22023';
      end if;
    else
      perform private.validate_selection_answer(question, answers -> question.code);
    end if;
  end loop;

  generated_protocol := upper(substr(replace(selected_call.id::text, '-', ''), 1, 6))
    || '-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS')
    || '-' || upper(substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6));

  insert into public.selection_applications (
    organization_id, incubator_id, call_id, form_version_id, applicant_user_id,
    applicant_name, applicant_email, applicant_phone, startup_name, legal_name,
    tax_id, city, state, sector, stage, summary, protocol
  ) values (
    selected_call.organization_id, selected_call.incubator_id, selected_call.id,
    form_id, authenticated_applicant_user_id, btrim(applicant_name), normalized_email,
    nullif(btrim(applicant_phone), ''), btrim(startup_name), nullif(btrim(legal_name), ''),
    nullif(btrim(tax_id), ''), nullif(btrim(city), ''), nullif(btrim(state), ''),
    nullif(btrim(sector), ''), coalesce(stage, 'idea'), nullif(btrim(summary), ''),
    generated_protocol
  ) returning id into application_id;

  for question in
    select q.* from public.selection_questions q where q.form_version_id = form_id
  loop
    if answers ? question.code then
      insert into public.selection_application_answers (
        organization_id, application_id, question_id, answer
      ) values (
        selected_call.organization_id, application_id, question.id, answers -> question.code
      );
    end if;
  end loop;

  insert into public.selection_application_events (
    organization_id, application_id, actor_user_id, event_type, metadata
  ) values (
    selected_call.organization_id, application_id, authenticated_applicant_user_id,
    'application.submitted', jsonb_build_object('protocol', generated_protocol)
  );

  return generated_protocol;
end;
$$;

revoke all on function public.submit_selection_application(
  text, text, text, text, text, text, text, text, text, text,
  public.startup_stage, text, jsonb, text, uuid
) from public, anon, authenticated;
grant execute on function public.submit_selection_application(
  text, text, text, text, text, text, text, text, text, text,
  public.startup_stage, text, jsonb, text, uuid
) to service_role;

revoke all on function public.submit_public_selection_appeal(text, text, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.submit_public_selection_appeal(
  call_slug text,
  application_protocol text,
  applicant_email text,
  grounds text,
  request_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.selection_applications%rowtype;
  selected_call public.selection_calls%rowtype;
  result uuid;
  normalized_email text := lower(btrim(applicant_email));
begin
  if request_fingerprint !~ '^[0-9a-f]{64}$'
    or coalesce(char_length(btrim(application_protocol)), 0) not between 10 and 100
    or coalesce(char_length(normalized_email), 0) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or coalesce(char_length(btrim(grounds)), 0) not between 30 and 5000
  then
    raise exception 'Dados do recurso inválidos' using errcode = '22023';
  end if;

  perform private.consume_public_action_rate_limit(
    'selection.appeal.ip:' || lower(left(btrim(call_slug), 120)),
    request_fingerprint, 30, interval '1 hour'
  );
  perform private.consume_public_action_rate_limit(
    'selection.appeal.identity:' || lower(left(btrim(call_slug), 120)),
    upper(btrim(application_protocol)) || ':' || normalized_email,
    10,
    interval '1 hour'
  );

  select proposal.* into application
  from public.selection_applications proposal
  join public.selection_calls call
    on call.organization_id = proposal.organization_id and call.id = proposal.call_id
  where lower(call.slug) = lower(btrim(call_slug))
    and proposal.protocol = upper(btrim(application_protocol))
    and proposal.applicant_email = normalized_email;

  if not found then
    raise exception 'Protocolo ou e-mail inválido' using errcode = 'P0002';
  end if;

  select * into selected_call from public.selection_calls where id = application.call_id;
  if selected_call.appeals_open_at is null
    or selected_call.appeals_close_at is null
    or now() not between selected_call.appeals_open_at and selected_call.appeals_close_at
  then
    raise exception 'Prazo de recurso indisponível' using errcode = '22023';
  end if;

  insert into public.selection_appeals (organization_id, call_id, application_id, grounds)
  values (application.organization_id, application.call_id, application.id, btrim(grounds))
  returning id into result;

  insert into public.selection_application_events (
    organization_id, application_id, event_type, metadata
  ) values (
    application.organization_id, application.id, 'appeal.submitted',
    jsonb_build_object('appealId', result)
  );
  return result;
end;
$$;

revoke all on function public.submit_public_selection_appeal(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_public_selection_appeal(text, text, text, text, text)
  to service_role;

revoke all on function public.respond_selection_convocation(text, text, boolean)
  from public, anon, authenticated, service_role;

create or replace function public.respond_selection_convocation(
  call_slug text,
  application_protocol text,
  applicant_email text,
  accept boolean,
  request_fingerprint text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.selection_applications%rowtype;
  convocation public.selection_convocations%rowtype;
  normalized_email text := lower(btrim(applicant_email));
begin
  if request_fingerprint !~ '^[0-9a-f]{64}$'
    or coalesce(char_length(btrim(application_protocol)), 0) not between 10 and 100
    or coalesce(char_length(normalized_email), 0) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'Dados da convocação inválidos' using errcode = '22023';
  end if;

  perform private.consume_public_action_rate_limit(
    'selection.convocation.ip:' || lower(left(btrim(call_slug), 120)),
    request_fingerprint, 30, interval '1 hour'
  );
  perform private.consume_public_action_rate_limit(
    'selection.convocation.identity:' || lower(left(btrim(call_slug), 120)),
    upper(btrim(application_protocol)) || ':' || normalized_email,
    10,
    interval '1 hour'
  );

  select proposal.* into application
  from public.selection_applications proposal
  join public.selection_calls call
    on call.organization_id = proposal.organization_id and call.id = proposal.call_id
  where lower(call.slug) = lower(btrim(call_slug))
    and proposal.protocol = upper(btrim(application_protocol))
    and proposal.applicant_email = normalized_email;

  if not found then
    raise exception 'Protocolo ou e-mail inválido' using errcode = 'P0002';
  end if;

  select * into convocation
  from public.selection_convocations item
  where item.organization_id = application.organization_id
    and item.application_id = application.id
  for update;

  if not found or convocation.status <> 'pending' or convocation.deadline_at <= now() then
    raise exception 'Convocação indisponível' using errcode = '22023';
  end if;

  update public.selection_convocations set
    status = case
      when accept then 'accepted'::public.selection_convocation_status
      else 'declined'::public.selection_convocation_status
    end,
    responded_at = now()
  where id = convocation.id;

  insert into public.selection_application_events (
    organization_id, application_id, event_type, metadata
  ) values (
    application.organization_id, application.id,
    case when accept then 'convocation.accepted' else 'convocation.declined' end,
    '{}'::jsonb
  );

  return case when accept then 'accepted' else 'declined' end;
end;
$$;

revoke all on function public.respond_selection_convocation(text, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.respond_selection_convocation(text, text, text, boolean, text)
  to service_role;

-- An evaluator is eligible for assignment, but the permission alone no longer
-- grants access to every CERNE cycle and evidence in the incubator.
delete from public.role_permissions permission
using public.roles role
where role.organization_id = permission.organization_id
  and role.id = permission.role_id
  and role.code = 'evaluator'
  and permission.permission_code = 'cerne.read';

create or replace function private.seed_cerne_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare permission_code text;
begin
  if not new.is_system or new.code = 'organization_admin' then return new; end if;
  foreach permission_code in array
    case new.code
      when 'incubator_manager' then array['cerne.read','cerne.manage','cerne.submit','cerne.review']
      when 'program_coordinator' then array['cerne.read','cerne.manage','cerne.submit','cerne.review']
      when 'agent' then array['cerne.read','cerne.submit']
      when 'mentor' then array['cerne.read','cerne.submit']
      when 'evaluator' then array['cerne.review']
      when 'auditor' then array['cerne.read']
      else array[]::text[]
    end
  loop
    insert into public.role_permissions (organization_id, role_id, permission_code)
    values (new.organization_id, new.id, permission_code)
    on conflict do nothing;
  end loop;
  return new;
end;
$$;

revoke all on function private.seed_cerne_role_permissions()
  from public, anon, authenticated;

create or replace function private.cerne_may_review(
  org_id uuid,
  inc_id uuid,
  cycle uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.cerne_may_manage(org_id, inc_id) or exists (
    select 1
    from public.cerne_review_assignments assignment
    join public.cerne_cycles selected_cycle
      on selected_cycle.organization_id = assignment.organization_id
      and selected_cycle.id = assignment.cycle_id
    where assignment.organization_id = org_id
      and selected_cycle.incubator_id = inc_id
      and (cycle is null or assignment.cycle_id = cycle)
      and assignment.reviewer_user_id = (select auth.uid())
      and assignment.status = 'active'
      and assignment.confidentiality_accepted_at is not null
      and (assignment.ends_at is null or assignment.ends_at > now())
  )
$$;

create or replace function public.review_cerne_evidence(
  target_evidence_id uuid,
  review_result public.cerne_review_result,
  review_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence public.cerne_evidences%rowtype;
  selected_cycle public.cerne_cycles%rowtype;
  assignment_id uuid;
  manager_override boolean;
begin
  select * into evidence from public.cerne_evidences
  where id = target_evidence_id for update;
  if evidence.id is null then
    raise exception 'Evidência indisponível' using errcode = '42501';
  end if;

  select * into selected_cycle from public.cerne_cycles where id = evidence.cycle_id;
  manager_override := private.cerne_may_manage(evidence.organization_id, selected_cycle.incubator_id);

  select assignment.id into assignment_id
  from public.cerne_review_assignments assignment
  where assignment.cycle_id = selected_cycle.id
    and assignment.reviewer_user_id = (select auth.uid())
    and assignment.status = 'active'
    and assignment.confidentiality_accepted_at is not null
    and (assignment.ends_at is null or assignment.ends_at > now())
    and (assignment.practice_code is null or assignment.practice_code = evidence.practice_code)
  order by (assignment.practice_code = evidence.practice_code) desc
  limit 1;

  if not manager_override and assignment_id is null then
    raise exception 'Evidência indisponível' using errcode = '42501';
  end if;
  if coalesce(char_length(btrim(review_notes)), 0) not between 10 and 5000 then
    raise exception 'O parecer deve ter entre 10 e 5000 caracteres' using errcode = '22023';
  end if;

  insert into public.cerne_evidence_reviews (
    organization_id, evidence_id, assignment_id, reviewer_user_id, result, notes
  ) values (
    evidence.organization_id, evidence.id, assignment_id, (select auth.uid()),
    review_result, btrim(review_notes)
  )
  on conflict (evidence_id, reviewer_user_id) do update set
    assignment_id = excluded.assignment_id,
    result = excluded.result,
    notes = excluded.notes,
    updated_at = now();

  update public.cerne_evidences set
    status = case
      when review_result = 'valid' then 'approved'::public.cerne_slot_status
      else 'rejected'::public.cerne_slot_status
    end,
    updated_at = now()
  where id = evidence.id;

  update public.cerne_evidence_slots set
    status = case
      when review_result = 'valid' then 'approved'::public.cerne_slot_status
      else 'rejected'::public.cerne_slot_status
    end,
    reviewed_by = (select auth.uid()),
    reviewed_at = now(),
    updated_at = now()
  where id = evidence.slot_id;
end;
$$;

create or replace function public.assign_cerne_reviewer(
  target_cycle_id uuid,
  target_reviewer_user_id uuid,
  target_practice_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_cycle public.cerne_cycles%rowtype;
  assignment_id uuid;
  actor uuid := (select auth.uid());
begin
  select * into selected_cycle from public.cerne_cycles where id = target_cycle_id;
  if not found or not private.cerne_may_manage(selected_cycle.organization_id, selected_cycle.incubator_id) then
    raise exception 'Ciclo indisponível' using errcode = '42501';
  end if;
  if target_practice_code is not null and not exists (
    select 1 from public.cerne_practices practice
    where practice.code = target_practice_code and practice.level <= selected_cycle.target_level
  ) then
    raise exception 'Prática fora do ciclo' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.organization_memberships membership
    join public.role_assignments role_assignment
      on role_assignment.organization_id = membership.organization_id
      and role_assignment.membership_id = membership.id
    join public.role_permissions role_permission
      on role_permission.organization_id = role_assignment.organization_id
      and role_permission.role_id = role_assignment.role_id
    where membership.organization_id = selected_cycle.organization_id
      and membership.user_id = target_reviewer_user_id
      and membership.status = 'active'
      and role_permission.permission_code = 'cerne.review'
      and (role_assignment.incubator_id is null or role_assignment.incubator_id = selected_cycle.incubator_id)
  ) then
    raise exception 'A pessoa precisa ter permissão de avaliação nesta incubadora' using errcode = '42501';
  end if;

  insert into public.cerne_review_assignments (
    organization_id, cycle_id, reviewer_user_id, practice_code, status, created_by
  ) values (
    selected_cycle.organization_id, selected_cycle.id, target_reviewer_user_id,
    target_practice_code, 'invited', actor
  )
  on conflict (cycle_id, reviewer_user_id, practice_code) do update set
    status = 'invited', starts_at = now(), ends_at = null,
    confidentiality_accepted_at = null, updated_at = now()
  returning id into assignment_id;
  return assignment_id;
end;
$$;

create or replace function public.get_cerne_workspace(
  target_organization_id uuid,
  target_incubator_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  can_manage boolean := private.cerne_may_manage(target_organization_id, target_incubator_id);
  can_submit boolean := private.cerne_may_submit(target_organization_id, target_incubator_id);
  can_review boolean := private.cerne_may_review(target_organization_id, target_incubator_id);
  can_read_all boolean := private.has_permission(target_organization_id, 'cerne.read', null, target_incubator_id);
begin
  if actor is null or not private.cerne_may_read(target_organization_id, target_incubator_id) then
    raise exception 'Permissão insuficiente' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'canManage', can_manage,
    'canSubmit', can_submit,
    'canReview', can_review,
    'practices', (select coalesce(jsonb_agg(to_jsonb(p) order by p.manual_order), '[]') from public.cerne_practices p where p.active),
    'requirements', (select coalesce(jsonb_agg(to_jsonb(r) order by p.manual_order, r.name), '[]') from public.cerne_evidence_requirements r join public.cerne_practices p on p.code = r.practice_code),
    'cycles', (select coalesce(jsonb_agg(to_jsonb(c) order by c.reference_year desc, c.created_at desc), '[]') from public.cerne_cycles c where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or can_submit or can_read_all or exists (select 1 from public.cerne_review_assignments a where a.cycle_id = c.id and a.reviewer_user_id = actor and a.status in ('invited', 'active') and (a.ends_at is null or a.ends_at > now())))),
    'owners', (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.cerne_practice_owners o join public.cerne_cycles c on c.organization_id = o.organization_id and c.id = o.cycle_id where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or can_submit or can_read_all or exists (select 1 from public.cerne_review_assignments a where a.cycle_id = c.id and a.reviewer_user_id = actor and a.status = 'active' and a.confidentiality_accepted_at is not null and (a.ends_at is null or a.ends_at > now()) and (a.practice_code is null or a.practice_code = o.practice_code)))),
    'slots', (select coalesce(jsonb_agg(to_jsonb(s) order by s.due_at nulls last, s.created_at), '[]') from public.cerne_evidence_slots s join public.cerne_cycles c on c.organization_id = s.organization_id and c.id = s.cycle_id where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or can_submit or can_read_all or exists (select 1 from public.cerne_review_assignments a where a.cycle_id = s.cycle_id and a.reviewer_user_id = actor and a.status = 'active' and a.confidentiality_accepted_at is not null and (a.ends_at is null or a.ends_at > now()) and (a.practice_code is null or a.practice_code = s.practice_code)))),
    'evidences', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]') from public.cerne_evidences e join public.cerne_cycles c on c.organization_id = e.organization_id and c.id = e.cycle_id where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or can_submit or can_read_all or exists (select 1 from public.cerne_review_assignments a where a.cycle_id = e.cycle_id and a.reviewer_user_id = actor and a.status = 'active' and a.confidentiality_accepted_at is not null and (a.ends_at is null or a.ends_at > now()) and (a.practice_code is null or a.practice_code = e.practice_code)))),
    'folders', (select coalesce(jsonb_agg(to_jsonb(f) order by f.logical_path), '[]') from public.cerne_drive_folders f join public.cerne_cycles c on c.organization_id = f.organization_id and c.id = f.cycle_id where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or can_submit or can_read_all)),
    'alerts', (select coalesce(jsonb_agg(to_jsonb(a) order by case a.severity when 'critical' then 1 when 'warning' then 2 else 3 end, a.due_at nulls last), '[]') from public.cerne_alerts a where a.organization_id = target_organization_id and a.incubator_id = target_incubator_id and a.status <> 'resolved' and (can_manage or can_submit or can_read_all)),
    'assignments', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]') from public.cerne_review_assignments a join public.cerne_cycles c on c.organization_id = a.organization_id and c.id = a.cycle_id where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or a.reviewer_user_id = actor)),
    'reviews', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]') from public.cerne_evidence_reviews r join public.cerne_evidences e on e.organization_id = r.organization_id and e.id = r.evidence_id join public.cerne_cycles c on c.organization_id = e.organization_id and c.id = e.cycle_id where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or r.reviewer_user_id = actor)),
    'programs', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name)), '[]') from public.programs p where p.organization_id = target_organization_id and p.incubator_id = target_incubator_id and p.deleted_at is null and (can_manage or can_submit or can_read_all)),
    'cohorts', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'programId', c.program_id)), '[]') from public.cohorts c join public.programs p on p.organization_id = c.organization_id and p.id = c.program_id where c.organization_id = target_organization_id and p.incubator_id = target_incubator_id and c.deleted_at is null and (can_manage or can_submit or can_read_all)),
    'startups', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name)), '[]') from public.startups s where s.organization_id = target_organization_id and s.incubator_id = target_incubator_id and s.deleted_at is null and (can_manage or can_submit or can_read_all)),
    'calls', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.title)), '[]') from public.selection_calls c where c.organization_id = target_organization_id and c.incubator_id = target_incubator_id and (can_manage or can_submit or can_read_all)),
    'people', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', coalesce(p.display_name, p.email), 'email', p.email) order by coalesce(p.display_name, p.email)), '[]') from public.organization_memberships m join public.profiles p on p.id = m.user_id where m.organization_id = target_organization_id and m.status = 'active' and can_manage)
  );
end;
$$;

-- Link the authenticated representative to the pending member created by a
-- selection conversion and activate the invited enrollment only after acceptance.
create or replace function private.bind_accepted_startup_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapping public.startup_onboarding_invitations%rowtype;
  target_startup_id uuid;
  target_member_id uuid;
begin
  if new.status <> 'accepted' or old.status = 'accepted' or new.accepted_by is null then
    return new;
  end if;

  select item.* into mapping
  from public.startup_onboarding_invitations item
  where item.invitation_id = new.id
  for update;
  if mapping.invitation_id is null then return new; end if;

  target_startup_id := mapping.startup_id;
  if target_startup_id is null then
    insert into public.startups (
      organization_id, incubator_id, code, name, stage, status, created_by
    ) values (
      mapping.organization_id, mapping.incubator_id, '', mapping.startup_name,
      'idea', 'active', new.invited_by
    ) returning id into target_startup_id;
  end if;

  select member.id into target_member_id
  from public.startup_members member
  where member.organization_id = mapping.organization_id
    and member.startup_id = target_startup_id
    and member.user_id = new.accepted_by
    and member.status = 'active'
  limit 1 for update;

  if target_member_id is null then
    select member.id into target_member_id
    from public.startup_members member
    where member.organization_id = mapping.organization_id
      and member.startup_id = target_startup_id
      and member.user_id is null
      and lower(member.email) = lower(new.email)
      and member.status = 'active'
    limit 1 for update;
  end if;

  if target_member_id is null then
    insert into public.startup_members (
      organization_id, startup_id, user_id, full_name, email, role,
      is_representative, status, joined_on, created_by
    ) values (
      mapping.organization_id, target_startup_id, new.accepted_by,
      coalesce(new.invited_name, mapping.startup_name), new.email, 'representative',
      true, 'active', current_date, new.invited_by
    ) returning id into target_member_id;
  else
    update public.startup_members set
      user_id = new.accepted_by,
      full_name = coalesce(nullif(btrim(new.invited_name), ''), full_name),
      email = lower(new.email),
      role = 'representative',
      is_representative = true,
      updated_at = now()
    where id = target_member_id;
  end if;

  if mapping.cohort_id is not null then
    update public.startup_enrollments set
      status = 'active', entry_date = coalesce(entry_date, current_date), updated_at = now()
    where organization_id = mapping.organization_id
      and startup_id = target_startup_id
      and cohort_id = mapping.cohort_id
      and status = 'invited';

    if not found and not exists (
      select 1 from public.startup_enrollments enrollment
      where enrollment.organization_id = mapping.organization_id
        and enrollment.startup_id = target_startup_id
        and enrollment.cohort_id = mapping.cohort_id
        and enrollment.status in ('active', 'suspended')
    ) then
      insert into public.startup_enrollments (
        organization_id, startup_id, cohort_id, status, source, entry_date, created_by
      ) values (
        mapping.organization_id, target_startup_id, mapping.cohort_id,
        'active', 'invitation', current_date, new.invited_by
      );
    end if;
  end if;

  update public.startup_onboarding_invitations
  set accepted_startup_id = target_startup_id
  where invitation_id = new.id;
  return new;
end;
$$;

create or replace function public.convert_selection_application(target_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.selection_applications%rowtype;
  selected_call public.selection_calls%rowtype;
  convocation public.selection_convocations%rowtype;
  cohort_record public.cohorts%rowtype;
  startup_id uuid;
  actor uuid := (select auth.uid());
  membership_id uuid;
  representative_role_id uuid;
  occupied integer;
  already_enrolled boolean;
begin
  select * into application from public.selection_applications
  where id = target_application_id for update;
  select * into selected_call from public.selection_calls where id = application.call_id;
  if application.id is null
    or application.status <> 'selected'
    or not private.selection_may_publish(application.organization_id, application.incubator_id)
  then
    raise exception 'Inscrição não pode ser convertida' using errcode = '42501';
  end if;
  if application.converted_startup_id is not null then return application.converted_startup_id; end if;

  select * into convocation from public.selection_convocations item
  where item.organization_id = application.organization_id
    and item.application_id = application.id
  for update;
  if not found or convocation.status <> 'accepted' then
    raise exception 'A convocação precisa estar aceita antes da matrícula' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.selection_publications publication
    where publication.organization_id = application.organization_id
      and publication.call_id = application.call_id and publication.phase = 'final'
  ) then
    raise exception 'O resultado final precisa estar publicado' using errcode = '23514';
  end if;

  select * into cohort_record from public.cohorts cohort
  where cohort.organization_id = application.organization_id
    and cohort.id = selected_call.cohort_id
  for update;

  select startup.id into startup_id from public.startups startup
  where startup.organization_id = application.organization_id
    and startup.tax_id is not distinct from application.tax_id
    and application.tax_id is not null
    and startup.deleted_at is null
  limit 1;

  if startup_id is not null and not exists (
    select 1 from public.startups startup
    where startup.organization_id = application.organization_id
      and startup.id = startup_id and startup.incubator_id = application.incubator_id
  ) then
    raise exception 'Já existe startup com este documento em outra incubadora da organização' using errcode = '23514';
  end if;

  if startup_id is null then
    insert into public.startups (
      organization_id, incubator_id, code, name, legal_name, tax_id,
      sector, stage, status, city, state, created_by
    ) values (
      application.organization_id, application.incubator_id, '', application.startup_name,
      application.legal_name, application.tax_id, application.sector, application.stage,
      'active', application.city, application.state, actor
    ) returning id into startup_id;
  end if;

  select exists (
    select 1 from public.startup_enrollments enrollment
    where enrollment.organization_id = application.organization_id
      and enrollment.startup_id = startup_id
      and enrollment.cohort_id = selected_call.cohort_id
      and enrollment.status in ('invited', 'active', 'suspended')
  ) into already_enrolled;
  select count(*) into occupied from public.startup_enrollments enrollment
  where enrollment.organization_id = application.organization_id
    and enrollment.cohort_id = selected_call.cohort_id
    and enrollment.status in ('invited', 'active', 'suspended');
  if not already_enrolled and cohort_record.capacity is not null and occupied >= cohort_record.capacity then
    raise exception 'A turma atingiu sua capacidade de % startups', cohort_record.capacity using errcode = '23514';
  end if;

  if application.applicant_user_id is not null then
    insert into public.organization_memberships (
      organization_id, user_id, status, joined_at, created_by
    ) values (
      application.organization_id, application.applicant_user_id, 'active', now(), actor
    ) on conflict (organization_id, user_id) do update set
      status = 'active',
      joined_at = coalesce(public.organization_memberships.joined_at, now()),
      suspended_at = null;

    select membership.id into membership_id from public.organization_memberships membership
    where membership.organization_id = application.organization_id
      and membership.user_id = application.applicant_user_id;
    select role.id into representative_role_id from public.roles role
    where role.organization_id = application.organization_id
      and role.code = 'startup_representative' and role.archived_at is null;
    if membership_id is not null and representative_role_id is not null then
      insert into public.role_assignments (
        organization_id, membership_id, role_id, incubator_id, created_by
      ) values (
        application.organization_id, membership_id, representative_role_id,
        application.incubator_id, actor
      ) on conflict do nothing;
    end if;
  end if;

  if not exists (
    select 1 from public.startup_members member
    where member.organization_id = application.organization_id
      and member.startup_id = startup_id
      and lower(member.email) = application.applicant_email
      and member.status = 'active'
  ) then
    insert into public.startup_members (
      organization_id, startup_id, user_id, full_name, email, role,
      is_representative, status, joined_on, created_by
    ) values (
      application.organization_id, startup_id, application.applicant_user_id,
      application.applicant_name, application.applicant_email, 'representative',
      true, 'active', current_date, actor
    );
  end if;

  if not already_enrolled then
    insert into public.startup_enrollments (
      organization_id, startup_id, cohort_id, status, source, entry_date, created_by
    ) values (
      application.organization_id, startup_id, selected_call.cohort_id,
      case when application.applicant_user_id is null
        then 'invited'::public.enrollment_status
        else 'active'::public.enrollment_status
      end,
      'selection_process',
      current_date,
      actor
    );
  end if;

  update public.selection_applications set converted_startup_id = startup_id, updated_at = now()
  where id = application.id;
  update public.selection_convocations set
    status = 'converted', converted_startup_id = startup_id,
    responded_at = coalesce(responded_at, now())
  where application_id = application.id;
  insert into public.selection_application_events (
    organization_id, application_id, actor_user_id, event_type, metadata
  ) values (
    application.organization_id, application.id, actor, 'application.converted',
    jsonb_build_object(
      'startupId', startup_id,
      'cohortId', selected_call.cohort_id,
      'onboardingPending', application.applicant_user_id is null
    )
  );
  return startup_id;
end;
$$;

create or replace function public.convert_selection_application_with_onboarding(
  target_application_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  startup_id uuid;
  application public.selection_applications%rowtype;
  cohort_id uuid;
begin
  startup_id := public.convert_selection_application(target_application_id);
  select * into application
  from public.selection_applications item
  where item.id = target_application_id;
  select call.cohort_id into cohort_id
  from public.selection_calls call
  where call.organization_id = application.organization_id
    and call.id = application.call_id;

  return jsonb_build_object(
    'startupId', startup_id,
    'applicantUserId', application.applicant_user_id,
    'applicantName', application.applicant_name,
    'applicantEmail', application.applicant_email,
    'startupName', application.startup_name,
    'cohortId', cohort_id,
    'onboardingPending', application.applicant_user_id is null
  );
end;
$$;

revoke all on function public.convert_selection_application_with_onboarding(uuid)
  from public, anon;
grant execute on function public.convert_selection_application_with_onboarding(uuid)
  to authenticated;

revoke all on function private.bind_accepted_startup_invitation()
  from public, anon, authenticated;

comment on table private.public_action_rate_limits is
  'Contadores distribuídos para limitar ações públicas executadas pelo servidor.';
comment on function private.cerne_may_review(uuid, uuid, uuid) is
  'Permite revisão CERNE apenas a gestores ou avaliadores com designação ativa e confidencialidade aceita.';

commit;
