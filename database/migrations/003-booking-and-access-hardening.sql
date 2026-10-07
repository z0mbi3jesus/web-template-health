-- Apply after the root schema and migration 002. No patient rows are deleted.
BEGIN;
CREATE OR REPLACE FUNCTION public.create_booked_appointment(p_client_id uuid, p_slot_id uuid, p_type_id uuid, p_start_time timestamptz, p_notes text DEFAULT NULL)
RETURNS public.appointments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE slot public.available_slots; kind public.appointment_types; result public.appointments;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_client_id AND is_active) THEN RAISE EXCEPTION 'Active profile required'; END IF;
 SELECT * INTO slot FROM public.available_slots WHERE id=p_slot_id FOR UPDATE;
 IF NOT FOUND OR slot.is_blocked OR slot.is_booked OR slot.current_bookings >= slot.max_bookings OR slot.start_time <= now() THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
 IF slot.appointment_type_id IS DISTINCT FROM p_type_id OR slot.start_time IS DISTINCT FROM p_start_time THEN RAISE EXCEPTION 'Slot mismatch'; END IF;
 SELECT * INTO kind FROM public.appointment_types WHERE id=p_type_id AND is_active;
 IF NOT FOUND OR slot.end_time < slot.start_time + make_interval(mins=>kind.duration_minutes) THEN RAISE EXCEPTION 'Invalid appointment type or duration'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=slot.staff_id AND is_active AND role IN ('staff','admin')) THEN RAISE EXCEPTION 'Provider unavailable'; END IF;
 UPDATE public.available_slots SET current_bookings=current_bookings+1, is_booked=(current_bookings+1 >= max_bookings) WHERE id=slot.id;
 INSERT INTO public.appointments(client_id,staff_id,slot_id,appointment_type_id,start_time,end_time,client_notes,price,status)
 VALUES(p_client_id,slot.staff_id,slot.id,kind.id,slot.start_time,slot.start_time+make_interval(mins=>kind.duration_minutes),p_notes,kind.price,CASE WHEN kind.requires_approval THEN 'pending' ELSE 'confirmed' END) RETURNING * INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.transition_appointment(p_appointment_id uuid,p_actor_id uuid,p_status text)
RETURNS public.appointments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item public.appointments; actor public.users;
BEGIN
 SELECT * INTO actor FROM public.users WHERE id=p_actor_id AND is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active profile required'; END IF;
 SELECT * INTO item FROM public.appointments WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Appointment missing'; END IF;
 IF NOT (actor.role='admin' OR (actor.role='staff' AND item.staff_id=actor.id) OR (actor.role='client' AND item.client_id=actor.id AND p_status='cancelled')) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF p_status NOT IN ('pending','confirmed','cancelled','completed','no_show') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF item.status=p_status THEN RETURN item; END IF;
 IF item.status IN ('cancelled','completed','no_show') OR p_status='pending' THEN RAISE EXCEPTION 'Invalid transition'; END IF;
 IF p_status='cancelled' AND item.slot_id IS NOT NULL THEN
  UPDATE public.available_slots SET current_bookings=GREATEST(0,current_bookings-1),is_booked=(GREATEST(0,current_bookings-1)>=max_bookings) WHERE id=item.slot_id;
 END IF;
 UPDATE public.appointments SET status=p_status,
 confirmed_at=CASE WHEN p_status='confirmed' THEN now() ELSE confirmed_at END,
 cancelled_at=CASE WHEN p_status='cancelled' THEN now() ELSE cancelled_at END,
 completed_at=CASE WHEN p_status='completed' THEN now() ELSE completed_at END
 WHERE id=item.id RETURNING * INTO item;
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION public.create_booked_appointment(uuid,uuid,uuid,timestamptz,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.transition_appointment(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_booked_appointment(uuid,uuid,uuid,timestamptz,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_appointment(uuid,uuid,text) TO service_role;
DO $$ BEGIN
 IF to_regprocedure('public.book_slot(uuid)') IS NOT NULL THEN
  REVOKE EXECUTE ON FUNCTION public.book_slot(uuid) FROM PUBLIC,anon,authenticated;
 END IF;
 IF to_regprocedure('public.cancel_booking(uuid)') IS NOT NULL THEN
  REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid) FROM PUBLIC,anon,authenticated;
 END IF;
END $$;
-- Remove legacy permissive policies before defining one access model.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('users','appointments','available_slots','appointment_types','notifications','audit_log','video_visits') LOOP
  EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.get_current_user_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT role FROM public.users WHERE id=auth.uid() AND is_active $$;
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.protect_user_access_fields() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF auth.role() IN ('authenticated','anon') AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.id IS DISTINCT FROM OLD.id) THEN
  RAISE EXCEPTION 'Access fields may only be changed by the server';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_user_access_fields ON public.users;
CREATE TRIGGER protect_user_access_fields BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.protect_user_access_fields();
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users,public.appointments,public.notifications,public.audit_log,public.video_visits FROM anon,authenticated;
REVOKE ALL ON public.available_slots,public.appointment_types FROM anon,authenticated;
GRANT SELECT ON public.users,public.appointments,public.notifications,public.audit_log,public.video_visits TO authenticated;
GRANT UPDATE(name,phone,avatar_url) ON public.users TO authenticated;
GRANT SELECT ON public.available_slots,public.appointment_types TO anon,authenticated;
CREATE POLICY profile_read ON public.users FOR SELECT TO authenticated USING(id=auth.uid() OR public.get_current_user_role() IN ('staff','admin'));
CREATE POLICY profile_edit ON public.users FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE POLICY appointment_read ON public.appointments FOR SELECT TO authenticated USING(client_id=auth.uid() OR staff_id=auth.uid() OR public.get_current_user_role()='admin');
CREATE POLICY slot_read ON public.available_slots FOR SELECT TO anon,authenticated USING(NOT is_blocked);
CREATE POLICY type_read ON public.appointment_types FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY notification_read ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY audit_read ON public.audit_log FOR SELECT TO authenticated USING(public.get_current_user_role()='admin');
CREATE POLICY video_read ON public.video_visits FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.appointments a WHERE a.id=appointment_id AND (a.client_id=auth.uid() OR a.staff_id=auth.uid())) OR public.get_current_user_role()='admin');
-- Browser clients must never retrieve bearer tokens from table reads.
UPDATE public.video_visits SET access_token=NULL;
REVOKE SELECT ON public.video_visits FROM authenticated;
GRANT SELECT(id,appointment_id,created_by,room_id,status,started_at,ended_at,created_at,updated_at,token_expires_at,participant_count) ON public.video_visits TO authenticated;
COMMIT;
