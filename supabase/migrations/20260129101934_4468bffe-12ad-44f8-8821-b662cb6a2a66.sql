-- Add policies to block unauthenticated (anonymous) access to sensitive tables
-- These policies ensure auth.uid() IS NOT NULL for all SELECT operations

-- 1. profiles - block anonymous access
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. patients - block anonymous access  
CREATE POLICY "Block anonymous access to patients" 
ON public.patients 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. doctors - block anonymous access
CREATE POLICY "Block anonymous access to doctors" 
ON public.doctors 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 4. prescriptions - block anonymous access
CREATE POLICY "Block anonymous access to prescriptions" 
ON public.prescriptions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 5. medication_reminders - block anonymous access
CREATE POLICY "Block anonymous access to medication_reminders" 
ON public.medication_reminders 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 6. dose_confirmations - block anonymous access
CREATE POLICY "Block anonymous access to dose_confirmations" 
ON public.dose_confirmations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 7. prescription_sales - block anonymous access
CREATE POLICY "Block anonymous access to prescription_sales" 
ON public.prescription_sales 
FOR SELECT 
USING (auth.uid() IS NOT NULL);