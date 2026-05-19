-- Restore standard Supabase table grants for the authenticated role.
-- RLS policies (auth.uid() = user_id) remain in force; these grants only
-- open the door to the RLS layer — they do not bypass it.
--
-- Background: an earlier security-advisor cleanup revoked execute on
-- SECURITY DEFINER functions but also left the default table grants
-- missing for the `authenticated` role, causing 403 / 42501
-- "permission denied for table ..." on every client REST call.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.saved_codes,
  public.label_templates,
  public.printer_profiles,
  public.print_jobs,
  public.print_job_items
to authenticated;

grant select on
  public.profiles,
  public.subscriptions,
  public.usage_events
to authenticated;

grant update on public.profiles to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
