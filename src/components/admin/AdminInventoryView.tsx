import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Package } from "lucide-react";
import { format } from "date-fns";

interface InventoryItem {
  id: string;
  medicine_name: string;
  batch_number: string;
  stock_quantity: number;
  min_stock_threshold: number;
  expiry_date: string;
  unit_price: number | null;
  manufacturer: string | null;
  category: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const AdminInventoryView = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .order("medicine_name", { ascending: true });

      if (error) throw error;

      setInventory(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching inventory",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stock stats
  const lowStockCount = inventory.filter((item) => 
    item.stock_quantity > 0 && item.stock_quantity <= item.min_stock_threshold
  ).length;
  
  const outOfStockCount = inventory.filter((item) => item.stock_quantity === 0).length;
  
  const expiringCount = inventory.filter((item) => {
    const expiryDate = new Date(item.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  }).length;

  // Filter inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = 
      item.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = item.stock_quantity > 0 && item.stock_quantity <= item.min_stock_threshold;
    } else if (stockFilter === "out") {
      matchesStock = item.stock_quantity === 0;
    } else if (stockFilter === "normal") {
      matchesStock = item.stock_quantity > item.min_stock_threshold;
    }
    
    return matchesSearch && matchesStock;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
  const paginatedInventory = filteredInventory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStockBadge = (item: InventoryItem) => {
    if (item.stock_quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.stock_quantity <= item.min_stock_threshold) {
      return <Badge className="bg-yellow-500">Low Stock</Badge>;
    }
    return <Badge className="bg-green-500">In Stock</Badge>;
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading inventory...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{inventory.length}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{lowStockCount}</p>
              <p className="text-sm text-muted-foreground">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{outOfStockCount}</p>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{expiringCount}</p>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by medicine, batch, or manufacturer..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="normal">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine Name</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Manufacturer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              paginatedInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.medicine_name}</TableCell>
                  <TableCell className="text-muted-foreground">{item.batch_number}</TableCell>
                  <TableCell>
                    {item.category ? (
                      <Badge variant="outline">{item.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={item.stock_quantity <= item.min_stock_threshold ? "text-destructive font-medium" : ""}>
                      {item.stock_quantity}
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">
                      (min: {item.min_stock_threshold})
                    </span>
                  </TableCell>
                  <TableCell>{getStockBadge(item)}</TableCell>
                  <TableCell>
                    <span className={isExpiringSoon(item.expiry_date) ? "text-orange-500 font-medium" : ""}>
                      {format(new Date(item.expiry_date), "MMM d, yyyy")}
                    </span>
                    {isExpiringSoon(item.expiry_date) && (
                      <AlertTriangle className="inline-block h-3 w-3 ml-1 text-orange-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    {item.unit_price ? `$${item.unit_price.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.manufacturer || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredInventory.length)} of {filteredInventory.length} items
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        * This is a read-only view. Admins cannot modify inventory data.
      </p>
    </div>
  );
};

export default AdminInventoryView;
