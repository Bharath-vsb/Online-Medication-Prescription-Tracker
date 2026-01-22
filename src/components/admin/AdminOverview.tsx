import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  UserPlus, 
  Stethoscope, 
  HeartPulse,
  Pill,
  FileText,
  Package,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalPharmacists: number;
  totalPrescriptions: number;
  activePrescriptions: number;
  totalInventoryItems: number;
  lowStockItems: number;
  pendingApprovals: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalPharmacists: 0,
    totalPrescriptions: 0,
    activePrescriptions: 0,
    totalInventoryItems: 0,
    lowStockItems: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user roles counts
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role");

      if (rolesError) throw rolesError;

      const doctorCount = rolesData.filter((r) => r.role === "doctor").length;
      const patientCount = rolesData.filter((r) => r.role === "patient").length;
      const pharmacistCount = rolesData.filter((r) => r.role === "pharmacist").length;

      // Fetch prescriptions
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from("prescriptions")
        .select("status");

      if (prescriptionsError) throw prescriptionsError;

      const activePrescriptions = prescriptionsData.filter((p) => p.status === "active").length;

      // Fetch inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("stock_quantity, min_stock_threshold");

      if (inventoryError) throw inventoryError;

      const lowStockItems = inventoryData.filter(
        (item) => item.stock_quantity <= item.min_stock_threshold
      ).length;

      // Fetch pending approvals count
      const profilesResult = await supabase
        .from("profiles")
        .select("id");
      
      const profilesData: any[] = profilesResult.data || [];
      const profilesError = profilesResult.error;

      if (profilesError) throw profilesError;

      setStats({
        totalUsers: rolesData.length,
        totalDoctors: doctorCount,
        totalPatients: patientCount,
        totalPharmacists: pharmacistCount,
        totalPrescriptions: prescriptionsData.length,
        activePrescriptions,
        totalInventoryItems: inventoryData.length,
        lowStockItems,
        pendingApprovals: profilesData.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Doctors",
      value: stats.totalDoctors,
      icon: Stethoscope,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Patients",
      value: stats.totalPatients,
      icon: HeartPulse,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pharmacists",
      value: stats.totalPharmacists,
      icon: Pill,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Prescriptions",
      value: stats.totalPrescriptions,
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Active Prescriptions",
      value: stats.activePrescriptions,
      icon: FileText,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10",
    },
    {
      title: "Inventory Items",
      value: stats.totalInventoryItems,
      icon: Package,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      title: "Low Stock Alerts",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-yellow-500" />
          <div>
            <p className="font-semibold text-yellow-600">Pending Approvals</p>
            <p className="text-sm text-muted-foreground">
              {stats.pendingApprovals} doctor/pharmacist registration(s) awaiting approval
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Users</span>
              <span className="font-medium">{stats.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Prescriptions</span>
              <span className="font-medium">{stats.activePrescriptions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inventory Health</span>
              <span className={`font-medium ${stats.lowStockItems > 0 ? "text-yellow-500" : "text-green-500"}`}>
                {stats.lowStockItems > 0 ? `${stats.lowStockItems} items need attention` : "Good"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Navigate to "Users" to manage all user accounts</p>
            <p>• Check "Authorization" for pending doctor/pharmacist approvals</p>
            <p>• View "Prescriptions" and "Inventory" for read-only access</p>
            <p>• Use filters and search in each section for quick access</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
