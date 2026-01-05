-- Create function to deduct stock when prescription is created
CREATE OR REPLACE FUNCTION public.deduct_inventory_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inventory_record RECORD;
  prescription_days INTEGER;
  doses_per_day INTEGER;
  total_quantity INTEGER;
BEGIN
  -- Calculate the duration of prescription in days
  IF NEW.end_date IS NOT NULL THEN
    prescription_days := (NEW.end_date - NEW.start_date) + 1;
  ELSE
    prescription_days := 30; -- Default 30 days if no end date
  END IF;

  -- Calculate doses per day based on frequency
  CASE NEW.frequency
    WHEN 'once_morning', 'once_afternoon', 'once_night' THEN doses_per_day := 1;
    WHEN 'twice_daily' THEN doses_per_day := 2;
    WHEN 'three_times_daily', 'every_8_hours' THEN doses_per_day := 3;
    ELSE doses_per_day := 1;
  END CASE;

  -- Total quantity to deduct
  total_quantity := prescription_days * doses_per_day;

  -- Find available inventory (not expired, sufficient stock)
  SELECT * INTO inventory_record
  FROM public.inventory
  WHERE medicine_name ILIKE NEW.medication_name
    AND expiry_date > CURRENT_DATE
    AND stock_quantity >= total_quantity
  ORDER BY expiry_date ASC -- Use oldest expiring first (FEFO)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock or medicine expired/not found for: %', NEW.medication_name;
  END IF;

  -- Deduct stock
  UPDATE public.inventory
  SET stock_quantity = stock_quantity - total_quantity,
      updated_at = NOW()
  WHERE id = inventory_record.id;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-deduct stock on prescription insert
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_prescription ON public.prescriptions;
CREATE TRIGGER trigger_deduct_stock_on_prescription
  AFTER INSERT ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_stock();

-- Enable realtime for inventory table
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;

-- Add RLS policy for pharmacists to view patient prescriptions
CREATE POLICY "Pharmacists can view all prescriptions"
ON public.prescriptions
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist'));

-- Allow pharmacists to view patient profiles for search
CREATE POLICY "Pharmacists can view patient profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist'));

-- Allow pharmacists to view patients table
CREATE POLICY "Pharmacists can view all patients"
ON public.patients
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist'));