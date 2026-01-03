import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Pill, 
  Package, 
  AlertTriangle, 
  Calendar,
  LogOut,
  User as UserIcon
} from "lucide-react";
import ProfileSetup from "@/components/ProfileSetup";
import InventoryManagement from "@/components/pharmacist/InventoryManagement";

interface InventoryStats {
  total: number;
  lowStock: number;
  expired: number;
  expiringSoon: number;
}

const PharmacistDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");
  const [stats, setStats] = useState<InventoryStats>({ total: 0, lowStock: 0, expired: 0, expiringSoon: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("inventory")
        .select("*");

      if (error) throw error;

      const total = data?.length || 0;
      const lowStock = data?.filter(item => item.stock_quantity <= item.min_stock_threshold).length || 0;
      const expired = data?.filter(item => item.expiry_date < today).length || 0;
      const expiringSoon = data?.filter(item => 
        item.expiry_date >= today && item.expiry_date <= thirtyDaysStr
      ).length || 0;

      setStats({ total, lowStock, expired, expiringSoon });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pharmacist Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">{user.email}</span>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
              variant="outline"
              size="sm"
              className="border-border hover:bg-secondary"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-muted-foreground text-sm">Total Medicines</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.lowStock}</p>
              <p className="text-muted-foreground text-sm">Low Stock</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.expired}</p>
              <p className="text-muted-foreground text-sm">Expired</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.expiringSoon}</p>
              <p className="text-muted-foreground text-sm">Expiring Soon</p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSetup user={user} role="pharmacist" onProfileComplete={() => {}} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PharmacistDashboard;