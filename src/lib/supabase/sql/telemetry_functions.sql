-- ==============================================================================
-- SMART LIFE MANAGER — CENTRAL CONTROL PLANE TELEMETRY & DEVICE RPCS
-- ==============================================================================
-- These functions provide secure, tamper-proof device registration and login
-- telemetry for authenticated clients.
-- 
-- SECURITY SPECIFICATIONS:
-- 1. SECURITY DEFINER: Executes with definer privileges.
-- 2. SET search_path = '': Prevents search_path hijacking vulnerabilities.
-- 3. Schema-qualified references: All table references explicitly target public.*.
-- 4. auth.uid() validation: The caller's authenticated identity is strictly derived
--    from the cryptographically verified JWT. Arbitrary customer_id spoofing is impossible.
-- 5. Revocation of PUBLIC/anon: Prevents unauthenticated telemetry tampering.
-- ==============================================================================

-- 1. Device Registration & Heartbeat RPC
CREATE OR REPLACE FUNCTION public.register_client_device(
  p_device_id text,
  p_os text,
  p_app_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_device_record record;
BEGIN
  -- Authoritative caller identification from JWT
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authenticated session required' USING ERRCODE = '42501';
  END IF;

  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RAISE EXCEPTION 'Bad Request: device_id cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Upsert device record strictly bound to auth.uid()
  INSERT INTO public.devices (customer_id, device_id, os, app_version, first_seen, last_seen, is_active)
  VALUES (v_caller_id, trim(p_device_id), p_os, p_app_version, now(), now(), true)
  ON CONFLICT (customer_id, device_id)
  DO UPDATE SET
    os = EXCLUDED.os,
    app_version = EXCLUDED.app_version,
    last_seen = now(),
    is_active = true
  RETURNING id, customer_id, device_id, os, app_version, first_seen, last_seen, is_active
  INTO v_device_record;

  RETURN jsonb_build_object(
    'success', true,
    'device_id', v_device_record.device_id,
    'last_seen', v_device_record.last_seen
  );
END;
$$;

-- Restrict execution permissions
REVOKE ALL ON FUNCTION public.register_client_device(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_client_device(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_client_device(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_client_device(text, text, text) TO service_role;

-- 2. Login Event Recording RPC
CREATE OR REPLACE FUNCTION public.record_client_login_event(
  p_device_id text,
  p_login_method text,
  p_os text,
  p_app_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
  v_event_id uuid;
BEGIN
  -- Authoritative caller identification from JWT
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authenticated session required' USING ERRCODE = '42501';
  END IF;

  -- Insert immutable login audit record
  INSERT INTO public.login_events (customer_id, device_id, login_method, os, app_version, created_at)
  VALUES (
    v_caller_id,
    trim(COALESCE(p_device_id, 'unknown')),
    COALESCE(p_login_method, 'unknown'),
    p_os,
    p_app_version,
    now()
  )
  RETURNING id INTO v_event_id;

  -- Update last_login_at in customer_profiles
  UPDATE public.customer_profiles
  SET last_login_at = now(),
      last_active_at = now()
  WHERE id = v_caller_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'recorded_at', now()
  );
END;
$$;

-- Restrict execution permissions
REVOKE ALL ON FUNCTION public.record_client_login_event(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_client_login_event(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_client_login_event(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_client_login_event(text, text, text, text) TO service_role;
