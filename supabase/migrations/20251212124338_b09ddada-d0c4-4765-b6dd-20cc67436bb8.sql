-- Add patient_id column for unique patient identification
ALTER TABLE public.profiles 
ADD COLUMN patient_id TEXT UNIQUE;

-- Create function to generate patient ID
CREATE OR REPLACE FUNCTION public.generate_patient_id()
RETURNS TRIGGER AS $$
DECLARE
  new_patient_id TEXT;
  role_exists BOOLEAN;
BEGIN
  -- Check if user has patient role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role = 'patient'
  ) INTO role_exists;
  
  -- Generate patient ID only if they're a patient
  IF role_exists AND NEW.patient_id IS NULL THEN
    new_patient_id := 'PAT-' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0');
    NEW.patient_id := new_patient_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create sequence for patient IDs
CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 1000;

-- Create trigger to auto-generate patient ID on profile update
CREATE TRIGGER generate_patient_id_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_patient_id();