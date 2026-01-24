-- Fix 1: Remove inventory access from doctors and patients (only pharmacists and admins should see it)
DROP POLICY IF EXISTS "Doctors can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Patients can view inventory" ON public.inventory;

-- Fix 2: Add admin access policy for prescription_sales
CREATE POLICY "Admins can view all sales" 
ON public.prescription_sales 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Remove doctor access to prescription_sales (they can use is_sold field on prescriptions)
DROP POLICY IF EXISTS "Doctors can view sales for their prescriptions" ON public.prescription_sales;