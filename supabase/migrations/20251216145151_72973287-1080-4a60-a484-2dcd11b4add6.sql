-- Allow patients to view profiles of doctors who have prescribed to them
CREATE POLICY "Patients can view prescribing doctor profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'patient'::app_role)
  AND EXISTS (
    SELECT 1 FROM prescriptions p
    JOIN patients pt ON pt.patient_id = p.patient_ref
    WHERE pt.user_id = auth.uid()
    AND p.doctor_id = profiles.id
  )
);