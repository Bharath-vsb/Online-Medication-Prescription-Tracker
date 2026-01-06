-- Create a function to auto-complete prescriptions where end_date has passed
CREATE OR REPLACE FUNCTION public.auto_complete_expired_prescriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prescriptions
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
END;
$$;

-- Create a helper function that can be called from the client to check and complete prescriptions
CREATE OR REPLACE FUNCTION public.check_and_complete_prescriptions()
RETURNS SETOF prescriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First update any expired prescriptions
  PERFORM auto_complete_expired_prescriptions();
  
  -- Return updated prescriptions
  RETURN QUERY SELECT * FROM prescriptions WHERE updated_at > NOW() - INTERVAL '1 second';
END;
$$;

-- Add duration_days column to prescriptions for easier tracking
ALTER TABLE public.prescriptions
ADD COLUMN IF NOT EXISTS duration_days integer;