begin;

-- The helper remains outside the exposed API schema, but RLS evaluates it as
-- the authenticated caller and therefore requires EXECUTE explicitly.
grant execute on function private.can_access_incubator_logo(text, text)
to authenticated;

commit;
