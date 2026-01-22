-- Add is_active column to profiles for soft delete/block functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add is_approved column for doctor/pharmacist approval workflow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);

-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to update profiles (for blocking/approving)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all doctors
CREATE POLICY "Admins can view all doctors"
ON public.doctors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all patients
CREATE POLICY "Admins can view all patients"
ON public.patients
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all prescriptions
CREATE POLICY "Admins can view all prescriptions"
ON public.prescriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to view all inventory
CREATE POLICY "Admins can view all inventory"
ON public.inventory
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));