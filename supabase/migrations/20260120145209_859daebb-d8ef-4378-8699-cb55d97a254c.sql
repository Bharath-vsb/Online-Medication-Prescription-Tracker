-- Fix RPC functions to add proper role-based authorization checks
-- This prevents any authenticated user from calling these functions without proper role

-- Replace auto_complete_expired_prescriptions with role-based authorization
CREATE OR REPLACE FUNCTION public.auto_complete_expired_prescriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users with doctor, patient, or pharmacist roles
  IF NOT (
    has_role(auth.uid(), 'doctor'::app_role) OR 
    has_role(auth.uid(), 'patient'::app_role) OR 
    has_role(auth.uid(), 'pharmacist'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only doctors, patients, or pharmacists can trigger prescription status updates';
  END IF;

  UPDATE public.prescriptions
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$;

-- Drop the check_and_complete_prescriptions function as it returns data that could bypass RLS
-- The auto_complete function is sufficient and returns void (no data leak)
DROP FUNCTION IF EXISTS public.check_and_complete_prescriptions();