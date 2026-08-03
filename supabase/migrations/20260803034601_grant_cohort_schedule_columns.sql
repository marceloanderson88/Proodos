-- Follow-up para o projeto remoto, onde a migration de redesign já foi aplicada.
begin;

grant insert (launches_on, enrollment_starts_on, enrollment_ends_on)
on public.cohorts to authenticated;

commit;
