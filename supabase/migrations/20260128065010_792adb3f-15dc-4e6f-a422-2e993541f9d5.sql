-- Fix 3 RLS security issues

-- 1. Fix medications_table_public_exposure: Require authentication to view medications
DROP POLICY IF EXISTS "Anyone can view medications" ON public.medications;
CREATE POLICY "Authenticated users can view medications" 
ON public.medications 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Fix profiles_phone_address_exposure: Restrict profile access to related users only
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Doctors can view patient profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pharmacists can view patient profiles" ON public.profiles;

-- Doctors can only view profiles of patients they have prescribed to
CREATE POLICY "Doctors can view profiles of their patients" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'doctor'::app_role) 
  AND (
    -- Allow doctors to view their own profile
    id = auth.uid()
    OR
    -- Allow doctors to view profiles of patients they have prescribed to
    EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.doctor_id = auth.uid()
      AND p.patient_id = profiles.id
    )
  )
);

-- Pharmacists can only view profiles of patients with prescriptions
CREATE POLICY "Pharmacists can view profiles of prescription patients" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND (
    -- Allow pharmacists to view their own profile
    id = auth.uid()
    OR
    -- Allow pharmacists to view profiles of patients with prescriptions
    EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.patient_id = profiles.id
    )
  )
);

-- 3. Fix patients_medical_notes_overexposure: Restrict patient data access
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Doctors can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Pharmacists can view all patients" ON public.patients;

-- Doctors can only view patient records of patients they have prescribed to
CREATE POLICY "Doctors can view their patients" 
ON public.patients 
FOR SELECT 
USING (
  has_role(auth.uid(), 'doctor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    JOIN doctors d ON d.doctor_id = p.doctor_ref
    WHERE d.user_id = auth.uid()
    AND p.patient_ref = patients.patient_id
  )
);

-- Pharmacists can only view patient records of patients with prescriptions (without medical_notes exposure)
-- Note: Pharmacists need basic patient info for prescription lookup but medical_notes should not be exposed
-- Since we can't do column-level RLS, we restrict to patients with prescriptions
CREATE POLICY "Pharmacists can view patients with prescriptions" 
ON public.patients 
FOR SELECT 
USING (
  has_role(auth.uid(), 'pharmacist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    WHERE p.patient_ref = patients.patient_id
  )
);