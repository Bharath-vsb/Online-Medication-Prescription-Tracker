import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Search,
  Package,
  Calendar,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DrugInfoModal from "./DrugInfoModal";

interface InventoryItem {
  id: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  stock_quantity: number;
  min_stock_threshold: number;
  category: string | null;
  manufacturer: string | null;
  unit_price: number | null;
  created_at: string;
  updated_at: string;
}

interface InventoryFormData {
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  stock_quantity: number;
  min_stock_threshold: number;
  category: string;
  manufacturer: string;
  unit_price: string;
}

const defaultFormData: InventoryFormData = {
  medicine_name: "",
  batch_number: "",
  expiry_date: "",
  stock_quantity: 0,
  min_stock_threshold: 10,
  category: "",
  manufacturer: "",
  unit_price: "",
};

const InventoryManagement = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchInventory();

    // Subscribe to realtime inventory updates
    const channel = supabase
      .channel('inventory-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory'
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("medicine_name");

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = (item: InventoryItem) => item.stock_quantity <= item.min_stock_threshold;
  const isExpired = (item: InventoryItem) => new Date(item.expiry_date) < new Date(today);
  const isExpiringSoon = (item: InventoryItem) => {
    const expiryDate = new Date(item.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && !isExpired(item);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        medicine_name: formData.medicine_name,
        batch_number: formData.batch_number,
        expiry_date: formData.expiry_date,
        stock_quantity: formData.stock_quantity,
        min_stock_threshold: formData.min_stock_threshold,
        category: formData.category || null,
        manufacturer: formData.manufacturer || null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("inventory")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Medicine updated successfully");
      } else {
        const { error } = await supabase
          .from("inventory")
          .insert(payload);

        if (error) throw error;
        toast.success("Medicine added successfully");
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Error saving medicine:", error);
      toast.error("Failed to save medicine");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      medicine_name: item.medicine_name,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      stock_quantity: item.stock_quantity,
      min_stock_threshold: item.min_stock_threshold,
      category: item.category || "",
      manufacturer: item.manufacturer || "",
      unit_price: item.unit_price?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medicine?")) return;

    try {
      const { error } = await supabase
        .from("inventory")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Medicine deleted successfully");
    } catch (error) {
      console.error("Error deleting medicine:", error);
      toast.error("Failed to delete medicine");
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = inventory.filter(isLowStock).length;
  const expiredCount = inventory.filter(isExpired).length;
  const expiringSoonCount = inventory.filter(isExpiringSoon).length;

  if (loading) {
    return <div className="text-center py-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {(lowStockCount > 0 || expiredCount > 0 || expiringSoonCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lowStockCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <div>
                <p className="font-semibold text-amber-600">{lowStockCount} Low Stock Items</p>
                <p className="text-sm text-muted-foreground">Reorder required</p>
              </div>
            </div>
          )}
          {expiredCount > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">{expiredCount} Expired Items</p>
                <p className="text-sm text-muted-foreground">Dispose immediately - Cannot be prescribed</p>
              </div>
            </div>
          )}
          {expiringSoonCount > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-orange-500" />
              <div>
                <p className="font-semibold text-orange-600">{expiringSoonCount} Expiring Soon</p>
                <p className="text-sm text-muted-foreground">Within 30 days - Prioritize usage</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setFormData(defaultFormData);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Medicine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="medicine_name">Medicine Name *</Label>
                  <Input
                    id="medicine_name"
                    value={formData.medicine_name}
                    onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="batch_number">Batch Number *</Label>
                  <Input
                    id="batch_number"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiry_date">Expiry Date *</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="min_stock_threshold">Min Stock Threshold *</Label>
                  <Input
                    id="min_stock_threshold"
                    type="number"
                    min="0"
                    value={formData.min_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, min_stock_threshold: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Antibiotic"
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingItem ? "Update" : "Add Medicine"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine Name</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No medicines found
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((item) => (
                <TableRow 
                  key={item.id} 
                  className={isExpired(item) ? "bg-destructive/5" : isLowStock(item) ? "bg-amber-500/5" : ""}
                >
                  <TableCell className="font-medium">{item.medicine_name}</TableCell>
                  <TableCell>{item.batch_number}</TableCell>
                  <TableCell>{new Date(item.expiry_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={isLowStock(item) ? "text-amber-600 font-semibold" : ""}>
                      {item.stock_quantity}
                    </span>
                    <span className="text-muted-foreground text-sm"> / {item.min_stock_threshold}</span>
                  </TableCell>
                  <TableCell>{item.category || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {isExpired(item) && (
                        <Badge variant="destructive">Expired - Dispose</Badge>
                      )}
                      {isExpiringSoon(item) && (
                        <Badge className="bg-orange-500">Expiring Soon</Badge>
                      )}
                      {isLowStock(item) && (
                        <Badge className="bg-amber-500">Low Stock</Badge>
                      )}
                      {!isExpired(item) && !isExpiringSoon(item) && !isLowStock(item) && (
                        <Badge variant="secondary">In Stock</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDrug(item.medicine_name)}
                        title="Drug Info"
                      >
                        <Info className="w-4 h-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Drug Info Modal */}
      <DrugInfoModal
        drugName={selectedDrug}
        onClose={() => setSelectedDrug(null)}
      />
    </div>
  );
};

export default InventoryManagement;
