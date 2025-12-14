-- Create patients table
CREATE TABLE public.patients (
  patient_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  medical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctors table
CREATE TABLE public.doctors (
  doctor_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  specialization TEXT,
  license_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Patients RLS policies
CREATE POLICY "Users can view their own patient record"
ON public.patients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patient record"
ON public.patients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patient record"
ON public.patients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view all patients"
ON public.patients FOR SELECT
USING (public.has_role(auth.uid(), 'doctor'));

-- Doctors RLS policies
CREATE POLICY "Users can view their own doctor record"
ON public.doctors FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own doctor record"
ON public.doctors FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doctor record"
ON public.doctors FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Patients can view doctor records for their prescriptions"
ON public.doctors FOR SELECT
USING (public.has_role(auth.uid(), 'patient'));

-- Drop existing foreign key constraints and policies on prescriptions if needed
DROP POLICY IF EXISTS "Doctors can create prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors can update their prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors can view their prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Patients can view their prescriptions" ON public.prescriptions;

-- Add new columns for proper foreign keys (keeping old columns temporarily for migration)
ALTER TABLE public.prescriptions 
ADD COLUMN doctor_ref UUID REFERENCES public.doctors(doctor_id),
ADD COLUMN patient_ref UUID REFERENCES public.patients(patient_id);

-- Create new RLS policies using the new references
CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE doctors.doctor_id = doctor_ref 
    AND doctors.user_id = auth.uid()
  )
  AND public.has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors can update their prescriptions"
ON public.prescriptions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE doctors.doctor_id = doctor_ref 
    AND doctors.user_id = auth.uid()
  )
  AND public.has_role(auth.uid(), 'doctor')
);

CREATE POLICY "Doctors can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE doctors.doctor_id = doctor_ref 
    AND doctors.user_id = auth.uid()
  )
);

CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients 
    WHERE patients.patient_id = patient_ref 
    AND patients.user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();