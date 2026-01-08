import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Medicine {
  id: string;
  name: string;
  category: string | null;
  in_inventory: boolean;
}

interface InventoryItem {
  medicine_name: string;
  stock_quantity: number;
}

interface MedicineSelectProps {
  value: string;
  onValueChange: (value: string, inInventory: boolean, stockQuantity: number) => void;
  userId: string;
  userName: string;
  disabled?: boolean;
}

const MedicineSelect = ({
  value,
  onValueChange,
  userId,
  userName,
  disabled = false,
}: MedicineSelectProps) => {
  const [open, setOpen] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    
    // Subscribe to medications and inventory changes
    const medicationsChannel = supabase
      .channel('medications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, fetchData)
      .subscribe();

    const inventoryChannel = supabase
      .channel('inventory-medicine-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(medicationsChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch medications (limit to 70)
    const { data: medsData } = await supabase
      .from("medications")
      .select("id, name, category, in_inventory")
      .order("name")
      .limit(70);

    if (medsData) {
      setMedicines(medsData);
    }

    // Fetch inventory for stock info (kept for internal logic only)
    const { data: invData } = await supabase
      .from("inventory")
      .select("medicine_name, stock_quantity")
      .gt("stock_quantity", 0);

    if (invData) {
      setInventory(invData);
    }

    setLoading(false);
  };

  const getStockQuantity = (medicineName: string): number => {
    const item = inventory.find(
      (inv) => inv.medicine_name.toLowerCase() === medicineName.toLowerCase()
    );
    return item?.stock_quantity || 0;
  };

  const handleAddNewMedicine = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Check if medicine already exists
      const existing = medicines.find(
        (m) => m.name.toLowerCase() === searchQuery.toLowerCase()
      );

      if (existing) {
        toast.info("This medicine already exists in the list");
        return;
      }

      // Add new medicine (not in inventory)
      const { data, error } = await supabase
        .from("medications")
        .insert({
          name: searchQuery.trim(),
          in_inventory: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to pharmacist
      await supabase.from("pharmacist_notifications").insert({
        notification_type: "medicine_request",
        medicine_name: searchQuery.trim(),
        requested_by: userId,
        doctor_name: userName,
      });

      toast.success(
        `"${searchQuery.trim()}" added. Pharmacist has been notified to stock it.`
      );

      // Select the newly added medicine
      if (data) {
        onValueChange(data.name, false, 0);
      }

      setOpen(false);
      setSearchQuery("");
      fetchData();
    } catch (error) {
      console.error("Error adding medicine:", error);
      toast.error("Failed to add medicine");
    }
  };

  const handleSelect = (medicine: Medicine) => {
    const stockQty = getStockQuantity(medicine.name);
    const inInventory = medicine.in_inventory && stockQty > 0;
    
    onValueChange(medicine.name, inInventory, stockQty);
    
    if (!inInventory) {
      // Send notification if medicine not in inventory
      supabase.from("pharmacist_notifications").insert({
        notification_type: "medicine_request",
        medicine_name: medicine.name,
        requested_by: userId,
        doctor_name: userName,
      }).then(() => {
        toast.info(`Pharmacist notified to add "${medicine.name}" to inventory`);
      });
    }
    
    setOpen(false);
  };

  const filteredMedicines = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const showAddOption =
    searchQuery.trim() &&
    !medicines.some(
      (m) => m.name.toLowerCase() === searchQuery.toLowerCase()
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {value || "Select medicine..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border z-50">
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder="Search medicines..."
            className="h-9"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading medicines...
              </div>
            ) : (
              <>
                {filteredMedicines.length === 0 && !showAddOption && (
                  <CommandEmpty>No medicines found.</CommandEmpty>
                )}
                
                {showAddOption && (
                  <CommandGroup heading="Add New">
                    <CommandItem
                      onSelect={handleAddNewMedicine}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      <span>Add "{searchQuery.trim()}"</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        New medicine
                      </Badge>
                    </CommandItem>
                  </CommandGroup>
                )}

                <CommandGroup heading={`Medicines (${filteredMedicines.length})`}>
                  {filteredMedicines.map((medicine) => (
                    <CommandItem
                      key={medicine.id}
                      value={medicine.name}
                      onSelect={() => handleSelect(medicine)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === medicine.name
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span>{medicine.name}</span>
                      {medicine.category && (
                        <span className="text-xs text-muted-foreground">
                          ({medicine.category})
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MedicineSelect;
