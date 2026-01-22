import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { CheckCircle, XCircle, UserCheck, UserX, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PendingUser {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
  specialization?: string;
  license_number?: string;
}

const AdminAuthorizationPanel = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .in("role", ["doctor", "pharmacist"]);

      if (rolesError) throw rolesError;

      // Fetch profiles - using type assertion as new columns may not be in generated types yet
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, is_active, is_approved, specialization, medical_license_number") as {
          data: Array<{
            id: string;
            full_name: string;
            is_active: boolean;
            is_approved: boolean;
            specialization: string | null;
            medical_license_number: string | null;
          }> | null;
          error: any;
        };

      if (profilesError) throw profilesError;

      // Fetch doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("user_id, specialization, license_number");

      if (doctorsError) throw doctorsError;

      // Combine data
      const combinedUsers: PendingUser[] = rolesData.map((role) => {
        const profile = profilesData.find((p) => p.id === role.user_id);
        const doctor = doctorsData.find((d) => d.user_id === role.user_id);

        return {
          id: role.user_id,
          user_id: role.user_id,
          full_name: profile?.full_name || "Unknown",
          role: role.role,
          is_approved: profile?.is_approved ?? true,
          is_active: profile?.is_active ?? true,
          created_at: role.created_at,
          specialization: doctor?.specialization || profile?.specialization,
          license_number: doctor?.license_number || profile?.medical_license_number,
        };
      });

      setAllUsers(combinedUsers);
      setPendingUsers(combinedUsers.filter((u) => !u.is_approved));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (user: PendingUser, approve: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_approved: approve } as any)
        .eq("id", user.user_id);

      if (error) throw error;

      // Update local state
      const updateUser = (u: PendingUser) =>
        u.user_id === user.user_id ? { ...u, is_approved: approve } : u;
      
      setAllUsers(allUsers.map(updateUser));
      setPendingUsers(pendingUsers.filter((u) => u.user_id !== user.user_id));

      toast({
        title: approve ? "User approved" : "User rejected",
        description: `${user.full_name} has been ${approve ? "approved" : "rejected"}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating user",
        description: error.message,
      });
    }
  };

  const handleToggleActive = async (user: PendingUser) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !user.is_active } as any)
        .eq("id", user.user_id);

      if (error) throw error;

      setAllUsers(allUsers.map((u) =>
        u.user_id === user.user_id ? { ...u, is_active: !u.is_active } : u
      ));

      toast({
        title: user.is_active ? "User blocked" : "User unblocked",
        description: `${user.full_name} has been ${user.is_active ? "blocked" : "unblocked"}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating user",
        description: error.message,
      });
    }
  };

  const filteredUsers = allUsers.filter((user) => 
    roleFilter === "all" || user.role === roleFilter
  );

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Pending Approvals ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Manage Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No pending approvals</p>
              <p className="text-sm">All doctors and pharmacists have been reviewed.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "doctor" ? "default" : "outline"}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.role === "doctor" && (
                          <div>
                            <p>Specialization: {user.specialization || "N/A"}</p>
                            <p>License: {user.license_number || "N/A"}</p>
                          </div>
                        )}
                        {user.role === "pharmacist" && <span>Pharmacist Registration</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproval(user, true)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleApproval(user, false)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manage" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="pharmacist">Pharmacists</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Approval Status</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "doctor" ? "default" : "outline"}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_approved ? "default" : "secondary"} className={user.is_approved ? "bg-green-500" : "bg-yellow-500"}>
                          {user.is_approved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "destructive"}>
                          {user.is_active ? "Active" : "Blocked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!user.is_approved && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600"
                              onClick={() => handleApproval(user, true)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(user)}
                            title={user.is_active ? "Block user" : "Unblock user"}
                          >
                            {user.is_active ? (
                              <UserX className="h-4 w-4 text-destructive" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAuthorizationPanel;
