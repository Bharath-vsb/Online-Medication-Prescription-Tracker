-- Add 'sold' column to prescriptions to track if medicine has been sold
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT FALSE;

-- Add 'in_inventory' column to medications to track availability
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS in_inventory BOOLEAN DEFAULT FALSE;

-- Create pharmacist_notifications table for alerts
CREATE TABLE IF NOT EXISTS public.pharmacist_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL, -- 'medicine_request', 'low_stock'
  medicine_name TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  doctor_name TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pharmacist_notifications
ALTER TABLE public.pharmacist_notifications ENABLE ROW LEVEL SECURITY;

-- Pharmacists can view all notifications
CREATE POLICY "Pharmacists can view all notifications"
ON public.pharmacist_notifications
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- Pharmacists can update notifications (mark as read)
CREATE POLICY "Pharmacists can update notifications"
ON public.pharmacist_notifications
FOR UPDATE
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- Pharmacists can delete notifications
CREATE POLICY "Pharmacists can delete notifications"
ON public.pharmacist_notifications
FOR DELETE
USING (has_role(auth.uid(), 'pharmacist'::app_role));

-- Doctors can insert notifications
CREATE POLICY "Doctors can insert notifications"
ON public.pharmacist_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'doctor'::app_role));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pharmacist_notifications_unread 
ON public.pharmacist_notifications(is_read) WHERE is_read = false;

-- Create index on medications for quick lookup
CREATE INDEX IF NOT EXISTS idx_medications_name 
ON public.medications(name);

-- Sync medications table with inventory - add medicines from inventory to medications
INSERT INTO public.medications (name, category, in_inventory)
SELECT DISTINCT medicine_name, category, true
FROM public.inventory
WHERE NOT EXISTS (
  SELECT 1 FROM public.medications WHERE LOWER(name) = LOWER(inventory.medicine_name)
)
ON CONFLICT DO NOTHING;

-- Function to auto-sync when inventory is added
CREATE OR REPLACE FUNCTION public.sync_medication_on_inventory_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if medication already exists
  IF NOT EXISTS (SELECT 1 FROM public.medications WHERE LOWER(name) = LOWER(NEW.medicine_name)) THEN
    INSERT INTO public.medications (name, category, in_inventory)
    VALUES (NEW.medicine_name, NEW.category, true);
  ELSE
    UPDATE public.medications 
    SET in_inventory = true, category = COALESCE(NEW.category, category)
    WHERE LOWER(name) = LOWER(NEW.medicine_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for inventory insert
DROP TRIGGER IF EXISTS trigger_sync_medication_on_inventory_insert ON public.inventory;
CREATE TRIGGER trigger_sync_medication_on_inventory_insert
AFTER INSERT ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.sync_medication_on_inventory_insert();

-- Function to create low stock notification
CREATE OR REPLACE FUNCTION public.check_low_stock_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if stock is low (<=100) and no recent notification exists
  IF NEW.stock_quantity <= 100 AND NEW.stock_quantity > 0 THEN
    -- Only create notification if one doesn't exist in last 24 hours
    IF NOT EXISTS (
      SELECT 1 FROM public.pharmacist_notifications 
      WHERE medicine_name = NEW.medicine_name 
      AND notification_type = 'low_stock'
      AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO public.pharmacist_notifications (notification_type, medicine_name)
      VALUES ('low_stock', NEW.medicine_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for low stock notification
DROP TRIGGER IF EXISTS trigger_check_low_stock ON public.inventory;
CREATE TRIGGER trigger_check_low_stock
AFTER UPDATE OF stock_quantity ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock_notification();