-- Create inventory table for pharmacist medicine management
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medicine_name TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_threshold INTEGER NOT NULL DEFAULT 10,
  category TEXT,
  manufacturer TEXT,
  unit_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT positive_stock CHECK (stock_quantity >= 0),
  CONSTRAINT positive_threshold CHECK (min_stock_threshold >= 0)
);

-- Enable Row Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Pharmacists can do everything on inventory
CREATE POLICY "Pharmacists can view all inventory"
ON public.inventory
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Pharmacists can insert inventory"
ON public.inventory
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Pharmacists can update inventory"
ON public.inventory
FOR UPDATE
USING (has_role(auth.uid(), 'pharmacist'::app_role));

CREATE POLICY "Pharmacists can delete inventory"
ON public.inventory
FOR DELETE
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- Doctors can view inventory (read-only for prescribing reference)
CREATE POLICY "Doctors can view inventory"
ON public.inventory
FOR SELECT
USING (has_role(auth.uid(), 'doctor'::app_role));

-- Patients can view basic inventory info (read-only for drug info)
CREATE POLICY "Patients can view inventory"
ON public.inventory
FOR SELECT
USING (has_role(auth.uid(), 'patient'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_inventory_medicine_name ON public.inventory(medicine_name);
CREATE INDEX idx_inventory_expiry_date ON public.inventory(expiry_date);
CREATE INDEX idx_inventory_low_stock ON public.inventory(stock_quantity, min_stock_threshold);