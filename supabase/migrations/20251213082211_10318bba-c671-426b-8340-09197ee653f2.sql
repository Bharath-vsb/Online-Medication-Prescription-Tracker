-- Create medications table with common tablets
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  default_dosage TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read medications
CREATE POLICY "Anyone can view medications"
ON public.medications
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage medications
CREATE POLICY "Admins can manage medications"
ON public.medications
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert common medications
INSERT INTO public.medications (name, category, default_dosage) VALUES
  ('Paracetamol', 'Pain Relief', '500mg'),
  ('Ibuprofen', 'Pain Relief', '400mg'),
  ('Amoxicillin', 'Antibiotic', '500mg'),
  ('Azithromycin', 'Antibiotic', '250mg'),
  ('Metformin', 'Diabetes', '500mg'),
  ('Atorvastatin', 'Cholesterol', '10mg'),
  ('Omeprazole', 'Gastric', '20mg'),
  ('Pantoprazole', 'Gastric', '40mg'),
  ('Cetirizine', 'Allergy', '10mg'),
  ('Montelukast', 'Allergy', '10mg'),
  ('Amlodipine', 'Blood Pressure', '5mg'),
  ('Losartan', 'Blood Pressure', '50mg'),
  ('Aspirin', 'Blood Thinner', '75mg'),
  ('Clopidogrel', 'Blood Thinner', '75mg'),
  ('Metoprolol', 'Heart', '25mg'),
  ('Atenolol', 'Heart', '50mg'),
  ('Levothyroxine', 'Thyroid', '50mcg'),
  ('Prednisone', 'Steroid', '5mg'),
  ('Dexamethasone', 'Steroid', '4mg'),
  ('Vitamin D3', 'Supplement', '1000IU'),
  ('Vitamin B12', 'Supplement', '1500mcg'),
  ('Folic Acid', 'Supplement', '5mg'),
  ('Iron Supplement', 'Supplement', '65mg'),
  ('Calcium', 'Supplement', '500mg');