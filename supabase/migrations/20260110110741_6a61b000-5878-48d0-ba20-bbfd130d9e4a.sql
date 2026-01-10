-- Drop the trigger that blocks prescription creation when medicine not in inventory
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_prescription ON public.prescriptions;

-- Drop the function as well since it's no longer needed
DROP FUNCTION IF EXISTS public.deduct_inventory_stock();