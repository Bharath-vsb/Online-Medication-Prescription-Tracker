import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  FileText, 
  Package,
  UserCheck,
  LogOut,
  LayoutDashboard,
  User as UserIcon
} from "lucide-react";
import ProfileSetup from "@/components/ProfileSetup";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminUsersManagement from "@/components/admin/AdminUsersManagement";
import AdminPrescriptionsView from "@/components/admin/AdminPrescriptionsView";
import AdminInventoryView from "@/components/admin/AdminInventoryView";
import AdminAuthorizationPanel from "@/components/admin/AdminAuthorizationPanel";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const AdminDashboard = () => {
  const { user, loading, hasAccess } = useRoleAccess("admin");
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !hasAccess) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="authorization" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Authorization
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Dashboard Overview</h2>
              <AdminOverview />
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Users Management</h2>
              <p className="text-muted-foreground mb-6">
                Manage all doctors, patients, and pharmacists. You can view profiles, block/unblock users, and delete accounts.
              </p>
              <AdminUsersManagement />
            </div>
          </TabsContent>

          <TabsContent value="prescriptions">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Prescription Details</h2>
              <p className="text-muted-foreground mb-6">
                View all prescriptions in the system. This is a read-only view.
              </p>
              <AdminPrescriptionsView />
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Inventory Details</h2>
              <p className="text-muted-foreground mb-6">
                View pharmacy inventory, stock levels, and expiry information. This is a read-only view.
              </p>
              <AdminInventoryView />
            </div>
          </TabsContent>

          <TabsContent value="authorization">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Authorization & Access Control</h2>
              <p className="text-muted-foreground mb-6">
                Approve or reject doctor/pharmacist registrations and manage user access.
              </p>
              <AdminAuthorizationPanel />
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSetup user={user} role="admin" onProfileComplete={() => {}} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
