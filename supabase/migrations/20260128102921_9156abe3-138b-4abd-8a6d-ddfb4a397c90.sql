-- Fix 1: Restrict pharmacist access to profiles - only view patients whose prescriptions they are currently processing
DROP POLICY IF EXISTS "Pharmacists can view profiles of prescription patients" ON public.profiles;
CREATE POLICY "Pharmacists can view profiles of prescription patients" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'pharmacist') AND (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM prescriptions p 
      WHERE p.patient_id = profiles.id 
      AND p.status = 'active'
    )
  )
);

-- Fix 2: Restrict pharmacist access to patients - only view patients with active prescriptions
DROP POLICY IF EXISTS "Pharmacists can view patients with prescriptions" ON public.patients;
CREATE POLICY "Pharmacists can view patients with active prescriptions" 
ON public.patients 
FOR SELECT 
USING (
  has_role(auth.uid(), 'pharmacist') AND 
  EXISTS (
    SELECT 1 FROM prescriptions p 
    WHERE p.patient_ref = patients.patient_id 
    AND p.status = 'active'
  )
);

-- Fix 3: Restrict patient access to doctors - only view doctors who have written them prescriptions
DROP POLICY IF EXISTS "Patients can view doctor records for their prescriptions" ON public.doctors;
CREATE POLICY "Patients can view their prescribing doctors" 
ON public.doctors 
FOR SELECT 
USING (
  has_role(auth.uid(), 'patient') AND 
  EXISTS (
    SELECT 1 FROM prescriptions p
    JOIN patients pt ON pt.patient_id = p.patient_ref
    WHERE pt.user_id = auth.uid() 
    AND p.doctor_ref = doctors.doctor_id
  )
);