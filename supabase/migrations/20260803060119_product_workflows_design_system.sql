begin;

do $$ begin
  create type public.incubator_kind as enum (
    'incubator',
    'accelerator',
    'innovation_hub',
    'innovation_center',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_mode as enum ('in_person', 'remote', 'hybrid');
exception when duplicate_object then null; end $$;

alter table public.incubators
  add column kind public.incubator_kind not null default 'incubator',
  add column custom_kind text,
  add column legal_name text,
  add column short_description text,
  add column logo_path text,
  add column contact_email text,
  add column phone text,
  add column website_url text,
  add column city text,
  add column state text,
  add column country_code text not null default 'BR',
  add column responsible_name text,
  add column onboarding_completed_at timestamptz;

alter table public.incubators
  add constraint incubators_custom_kind_valid check (
    (kind = 'other' and custom_kind is not null and custom_kind = btrim(custom_kind) and char_length(custom_kind) between 2 and 80)
    or (kind <> 'other' and custom_kind is null)
  ),
  add constraint incubators_legal_name_valid check (
    legal_name is null or (legal_name = btrim(legal_name) and char_length(legal_name) between 2 and 200)
  ),
  add constraint incubators_short_description_valid check (
    short_description is null or char_length(short_description) <= 1200
  ),
  add constraint incubators_logo_path_valid check (
    logo_path is null or (logo_path = btrim(logo_path) and char_length(logo_path) between 20 and 500)
  ),
  add constraint incubators_contact_email_valid check (
    contact_email is null or (
      contact_email = lower(btrim(contact_email))
      and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and char_length(contact_email) <= 320
    )
  ),
  add constraint incubators_phone_valid check (
    phone is null or (phone = btrim(phone) and char_length(phone) between 7 and 40)
  ),
  add constraint incubators_website_url_valid check (
    website_url is null or (website_url = btrim(website_url) and char_length(website_url) <= 2048)
  ),
  add constraint incubators_city_valid check (
    city is null or (city = btrim(city) and char_length(city) between 2 and 120)
  ),
  add constraint incubators_state_valid check (
    state is null or (state = btrim(state) and char_length(state) between 2 and 120)
  ),
  add constraint incubators_country_code_valid check (country_code ~ '^[A-Z]{2}$'),
  add constraint incubators_responsible_name_valid check (
    responsible_name is null or (responsible_name = btrim(responsible_name) and char_length(responsible_name) between 2 and 160)
  );

comment on column public.incubators.kind is 'Natureza operacional da organização apoiadora.';
comment on column public.incubators.onboarding_completed_at is 'Preenchido quando identidade, contato e primeiro gestor estão configurados.';

grant insert (
  kind, custom_kind, legal_name, short_description, logo_path, contact_email,
  phone, website_url, city, state, country_code, responsible_name,
  onboarding_completed_at
) on public.incubators to authenticated;
grant update (
  kind, custom_kind, legal_name, short_description, logo_path, contact_email,
  phone, website_url, city, state, country_code, responsible_name,
  onboarding_completed_at
) on public.incubators to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incubator-logos',
  'incubator-logos',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_incubator_logo(object_name text, permission_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  object_organization_id uuid;
  object_incubator_id uuid;
begin
  if (select auth.uid()) is null then return false; end if;

  begin
    object_organization_id := split_part(object_name, '/', 1)::uuid;
    object_incubator_id := split_part(object_name, '/', 2)::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return exists (
    select 1
    from public.incubators incubator
    where incubator.id = object_incubator_id
      and incubator.organization_id = object_organization_id
      and incubator.deleted_at is null
      and (select private.has_permission(
        incubator.organization_id,
        permission_code,
        incubator.unit_id,
        incubator.id
      ))
  );
end;
$$;

revoke execute on function private.can_access_incubator_logo(text, text)
from public, anon, authenticated;

create policy incubator_logos_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'incubator-logos'
  and (select private.can_access_incubator_logo(name, 'incubator.read'))
);

create policy incubator_logos_insert_manager
on storage.objects for insert to authenticated
with check (
  bucket_id = 'incubator-logos'
  and owner_id = (select auth.uid()::text)
  and (select private.can_access_incubator_logo(name, 'incubator.manage'))
);

create policy incubator_logos_update_manager
on storage.objects for update to authenticated
using (
  bucket_id = 'incubator-logos'
  and (select private.can_access_incubator_logo(name, 'incubator.manage'))
)
with check (
  bucket_id = 'incubator-logos'
  and (select private.can_access_incubator_logo(name, 'incubator.manage'))
);

create policy incubator_logos_delete_manager
on storage.objects for delete to authenticated
using (
  bucket_id = 'incubator-logos'
  and (select private.can_access_incubator_logo(name, 'incubator.manage'))
);

alter table public.invitations
  add column invited_name text,
  add column last_sent_at timestamptz not null default now(),
  add column send_count integer not null default 1;

alter table public.invitations
  add constraint invitations_invited_name_valid check (
    invited_name is null or (invited_name = btrim(invited_name) and char_length(invited_name) between 2 and 160)
  ),
  add constraint invitations_send_count_valid check (send_count between 1 and 20);

drop index public.invitations_pending_email_uidx;
create unique index invitations_pending_email_scope_uidx
on public.invitations (
  organization_id,
  email,
  coalesce(unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(incubator_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where status = 'pending';

grant select (invited_name, last_sent_at, send_count) on public.invitations to authenticated;
grant insert (invited_name, last_sent_at, send_count) on public.invitations to authenticated;
grant update (last_sent_at, send_count) on public.invitations to authenticated;

alter table public.programs
  alter column starts_on drop not null,
  add column objectives text,
  add column target_audience text,
  add column delivery_mode public.delivery_mode,
  add column duration_weeks integer,
  add column suggested_capacity integer;

alter table public.programs
  add constraint programs_objectives_valid check (objectives is null or char_length(objectives) <= 3000),
  add constraint programs_target_audience_valid check (target_audience is null or char_length(target_audience) <= 2000),
  add constraint programs_duration_weeks_valid check (duration_weeks is null or duration_weeks between 1 and 520),
  add constraint programs_suggested_capacity_valid check (suggested_capacity is null or suggested_capacity between 1 and 100000);

comment on column public.programs.starts_on is 'Início opcional da vigência do modelo de programa; datas de execução pertencem à turma.';
comment on column public.programs.ends_on is 'Fim opcional da vigência do modelo de programa; datas de execução pertencem à turma.';

grant insert (
  objectives, target_audience, delivery_mode, duration_weeks, suggested_capacity
) on public.programs to authenticated;
grant update (
  objectives, target_audience, delivery_mode, duration_weeks, suggested_capacity
) on public.programs to authenticated;

commit;
