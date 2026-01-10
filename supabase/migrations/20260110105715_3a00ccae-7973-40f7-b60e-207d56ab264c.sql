-- Allow pharmacists to update is_sold field on prescriptions
CREATE POLICY "Pharmacists can update prescription sold status" 
ON public.prescriptions 
FOR UPDATE 
USING (has_role(auth.uid(), 'pharmacist'::app_role))
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));