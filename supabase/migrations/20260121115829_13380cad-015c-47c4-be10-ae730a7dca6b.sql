-- Create prescription_sales table to track sold medicines
CREATE TABLE public.prescription_sales (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
    sold_quantity INTEGER NOT NULL,
    sold_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    sold_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(prescription_id)
);

-- Create dose_confirmations table to track patient dose confirmations
CREATE TABLE public.dose_confirmations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reminder_id UUID NOT NULL REFERENCES public.medication_reminders(reminder_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TEXT NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'missed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(reminder_id, scheduled_date, scheduled_time)
);

-- Enable RLS on prescription_sales
ALTER TABLE public.prescription_sales ENABLE ROW LEVEL SECURITY;

-- Enable RLS on dose_confirmations
ALTER TABLE public.dose_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prescription_sales

-- Pharmacists can insert sales
CREATE POLICY "Pharmacists can insert sales"
ON public.prescription_sales
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

-- Pharmacists can view all sales
CREATE POLICY "Pharmacists can view all sales"
ON public.prescription_sales
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- Patients can view their own sales
CREATE POLICY "Patients can view their own sales"
ON public.prescription_sales
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = prescription_sales.patient_id
    AND patients.user_id = auth.uid()
));

-- Doctors can view sales for their prescriptions
CREATE POLICY "Doctors can view sales for their prescriptions"
ON public.prescription_sales
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM prescriptions p
    JOIN doctors d ON d.doctor_id = p.doctor_ref
    WHERE p.id = prescription_sales.prescription_id
    AND d.user_id = auth.uid()
));

-- RLS Policies for dose_confirmations

-- Patients can view their own confirmations
CREATE POLICY "Patients can view their own confirmations"
ON public.dose_confirmations
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = dose_confirmations.patient_id
    AND patients.user_id = auth.uid()
));

-- Patients can insert their own confirmations
CREATE POLICY "Patients can insert their own confirmations"
ON public.dose_confirmations
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = dose_confirmations.patient_id
    AND patients.user_id = auth.uid()
));

-- Patients can update their own confirmations
CREATE POLICY "Patients can update their own confirmations"
ON public.dose_confirmations
FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = dose_confirmations.patient_id
    AND patients.user_id = auth.uid()
));

-- Doctors can view confirmations for their patients
CREATE POLICY "Doctors can view patient confirmations"
ON public.dose_confirmations
FOR SELECT
USING (has_role(auth.uid(), 'doctor'::app_role));

-- Pharmacists can view confirmations
CREATE POLICY "Pharmacists can view confirmations"
ON public.dose_confirmations
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- Create updated_at trigger for prescription_sales
CREATE TRIGGER update_prescription_sales_updated_at
BEFORE UPDATE ON public.prescription_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add sold_quantity to prescriptions for easy access
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS sold_quantity INTEGER DEFAULT 0;