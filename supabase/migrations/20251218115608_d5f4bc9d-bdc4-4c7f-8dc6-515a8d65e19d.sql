-- Create medication_reminders table
CREATE TABLE public.medication_reminders (
  reminder_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(patient_id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  reminder_times TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notification_type TEXT NOT NULL DEFAULT 'both', -- 'in_app', 'email', 'both'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id, prescription_id)
);

-- Enable RLS
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

-- Patients can view their own reminders
CREATE POLICY "Patients can view their own reminders"
ON public.medication_reminders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = medication_reminders.patient_id
    AND patients.user_id = auth.uid()
  )
);

-- Patients can create reminders for their prescriptions
CREATE POLICY "Patients can create their own reminders"
ON public.medication_reminders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = medication_reminders.patient_id
    AND patients.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM prescriptions
    WHERE prescriptions.id = medication_reminders.prescription_id
    AND prescriptions.patient_ref = medication_reminders.patient_id
    AND prescriptions.status = 'active'
  )
);

-- Patients can update their own reminders
CREATE POLICY "Patients can update their own reminders"
ON public.medication_reminders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = medication_reminders.patient_id
    AND patients.user_id = auth.uid()
  )
);

-- Patients can delete their own reminders
CREATE POLICY "Patients can delete their own reminders"
ON public.medication_reminders
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.patient_id = medication_reminders.patient_id
    AND patients.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_medication_reminders_updated_at
BEFORE UPDATE ON public.medication_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_reminders;