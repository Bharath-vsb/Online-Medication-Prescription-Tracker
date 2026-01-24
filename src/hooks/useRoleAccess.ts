import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type AppRole = "admin" | "doctor" | "patient" | "pharmacist";

interface UseRoleAccessResult {
  user: User | null;
  loading: boolean;
  hasAccess: boolean;
}

export const useRoleAccess = (requiredRole: AppRole): UseRoleAccessResult => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/auth");
          return;
        }

        // Verify user has the required role via server-side check
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (roleError || !roleData) {
          console.error("Role verification error:", roleError);
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Unable to verify your role. Please sign in again.",
          });
          navigate("/auth");
          return;
        }

        if (roleData.role !== requiredRole) {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: `This page requires ${requiredRole} access. Redirecting to your dashboard.`,
          });
          // Redirect to their correct dashboard
          const dashboardPath = roleData.role === "admin" ? "/admin" :
                               roleData.role === "doctor" ? "/doctor" :
                               roleData.role === "patient" ? "/patient" :
                               roleData.role === "pharmacist" ? "/pharmacist" : "/auth";
          navigate(dashboardPath);
          return;
        }

        // Also check if user is active and approved
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_active, is_approved")
          .eq("id", session.user.id)
          .single();

        const isActive = (profileData as any)?.is_active ?? true;
        const isApproved = (profileData as any)?.is_approved ?? true;

        if (!isActive) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Account Blocked",
            description: "Your account has been blocked. Please contact the administrator.",
          });
          navigate("/auth");
          return;
        }

        if (!isApproved && (requiredRole === "doctor" || requiredRole === "pharmacist")) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Pending Approval",
            description: "Your account is pending approval. Please wait for admin authorization.",
          });
          navigate("/auth");
          return;
        }

        setUser(session.user);
        setHasAccess(true);
      } catch (error) {
        console.error("Access check error:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setHasAccess(false);
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, requiredRole, toast]);

  return { user, loading, hasAccess };
};
