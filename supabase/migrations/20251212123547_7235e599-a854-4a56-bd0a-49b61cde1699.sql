-- Create prescription status enum
CREATE TYPE public.prescription_status AS ENUM ('active', 'completed', 'cancelled');

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  instructions TEXT,
  status prescription_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Doctors can view all prescriptions they created
CREATE POLICY "Doctors can view their prescriptions"
ON public.prescriptions
FOR SELECT
USING (doctor_id = auth.uid());

-- Doctors can create prescriptions
CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions
FOR INSERT
WITH CHECK (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

-- Doctors can update their prescriptions
CREATE POLICY "Doctors can update their prescriptions"
ON public.prescriptions
FOR UPDATE
USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

-- Patients can view their own prescriptions
CREATE POLICY "Patients can view their prescriptions"
ON public.prescriptions
FOR SELECT
USING (patient_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add phone and address to profiles
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT,
ADD COLUMN address TEXT;

-- Allow doctors to view patient profiles (for prescription assignment)
CREATE POLICY "Doctors can view patient profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'doctor'));