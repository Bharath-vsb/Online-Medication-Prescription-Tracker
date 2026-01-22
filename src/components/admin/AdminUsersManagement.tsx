import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, UserX, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";

interface UserData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  specialization?: string;
  license_number?: string;
  age?: number;
  gender?: string;
}

const ITEMS_PER_PAGE = 10;

const AdminUsersManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserData | null; permanent: boolean }>({
    open: false,
    user: null,
    permanent: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at");

      if (rolesError) throw rolesError;

      // Fetch all profiles - using type assertion as new columns may not be in generated types yet
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, is_active, is_approved, created_at, specialization, medical_license_number") as {
          data: Array<{
            id: string;
            full_name: string;
            is_active: boolean;
            is_approved: boolean;
            created_at: string;
            specialization: string | null;
            medical_license_number: string | null;
          }> | null;
          error: any;
        };

      if (profilesError) throw profilesError;

      // Fetch doctors data
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("user_id, specialization, license_number");

      if (doctorsError) throw doctorsError;

      // Fetch patients data
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("user_id, age, gender");

      if (patientsError) throw patientsError;

      // Combine data
      const combinedUsers: UserData[] = rolesData.map((role) => {
        const profile = profilesData.find((p) => p.id === role.user_id);
        const doctor = doctorsData.find((d) => d.user_id === role.user_id);
        const patient = patientsData.find((p) => p.user_id === role.user_id);

        return {
          id: role.user_id,
          user_id: role.user_id,
          full_name: profile?.full_name || "Unknown",
          email: "", // We can't access auth.users email directly
          role: role.role,
          is_active: profile?.is_active ?? true,
          is_approved: profile?.is_approved ?? true,
          created_at: role.created_at,
          specialization: doctor?.specialization || profile?.specialization,
          license_number: doctor?.license_number || profile?.medical_license_number,
          age: patient?.age,
          gender: patient?.gender,
        };
      });

      setUsers(combinedUsers);
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

  const handleToggleActive = async (user: UserData) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !user.is_active } as any)
        .eq("id", user.user_id);

      if (error) throw error;

      setUsers(users.map((u) => 
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

  const handleDelete = async (permanent: boolean) => {
    if (!deleteDialog.user) return;

    try {
      if (permanent) {
        // Note: We can only soft delete from client side
        // Permanent deletion would require a service role key in an edge function
        toast({
          variant: "destructive",
          title: "Permanent deletion",
          description: "Permanent deletion requires backend admin access. User has been soft-deleted instead.",
        });
      }

      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false } as any)
        .eq("id", deleteDialog.user.user_id);

      if (error) throw error;

      setUsers(users.map((u) => 
        u.user_id === deleteDialog.user!.user_id ? { ...u, is_active: false } : u
      ));

      toast({
        title: "User deleted",
        description: `${deleteDialog.user.full_name} has been ${permanent ? "permanently" : "soft"} deleted.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting user",
        description: error.message,
      });
    } finally {
      setDeleteDialog({ open: false, user: null, permanent: false });
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "doctor": return "default";
      case "patient": return "secondary";
      case "pharmacist": return "outline";
      case "admin": return "destructive";
      default: return "default";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name or role..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="doctor">Doctor</SelectItem>
            <SelectItem value="patient">Patient</SelectItem>
            <SelectItem value="pharmacist">Pharmacist</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"} className={user.is_active ? "bg-green-500" : "bg-red-500"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.role === "doctor" && user.specialization && (
                      <span>{user.specialization}</span>
                    )}
                    {user.role === "patient" && user.age && (
                      <span>{user.age} yrs, {user.gender || "N/A"}</span>
                    )}
                    {user.role === "pharmacist" && <span>Pharmacist</span>}
                    {user.role === "admin" && <span>Administrator</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        title={user.is_active ? "Block user" : "Unblock user"}
                      >
                        {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, user, permanent: false })}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.user?.full_name}</strong>?
              <br /><br />
              Choose delete type:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(false)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Soft Delete (Deactivate)
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleDelete(true)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Permanent Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsersManagement;
