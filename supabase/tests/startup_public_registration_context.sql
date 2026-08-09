begin;

select plan(6);

set local role anon;

select ok(
  public.get_startup_registration_context(
    'seed-org-a',
    'incubadora-sintetica-sertao'
  ) is not null,
  'anon pode obter o contexto público de uma incubadora ativa'
);

select is(
  public.get_startup_registration_context(
    'seed-org-a',
    'incubadora-sintetica-sertao'
  ) #>> '{organization,name}',
  'Incubadora Sintética A',
  'o contexto contém o nome da organização'
);

select is(
  public.get_startup_registration_context(
    'seed-org-a',
    'incubadora-sintetica-sertao'
  ) #>> '{incubator,name}',
  'Incubadora Sintética Sertão',
  'o contexto contém o nome da incubadora'
);

select ok(
  jsonb_typeof(
    public.get_startup_registration_context(
      'seed-org-a',
      'incubadora-sintetica-sertao'
    ) -> 'cohorts'
  ) = 'array',
  'as turmas elegíveis são retornadas como uma lista'
);

select is(
  public.get_startup_registration_context(
    'seed-org-a',
    'incubadora-sintetica-sertao'
  ) ? 'organizationId',
  false,
  'identificadores internos da organização não são expostos'
);

select is(
  public.get_startup_registration_context('inexistente', 'inexistente'),
  null::jsonb,
  'contexto inexistente não revela dados'
);

select * from finish();

rollback;
