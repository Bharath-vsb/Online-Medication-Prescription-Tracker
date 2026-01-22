import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !roleLoading) {
      if (isAuthenticated && role) {
        navigate(`/${role}`);
      } else if (!isAuthenticated) {
        navigate("/auth");
      }
    }
  }, [loading, roleLoading, isAuthenticated, role, navigate]);

  if (loading || (isAuthenticated && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-xl text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Stethoscope className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground">Medical Portal</h1>
          <p className="text-xl text-muted-foreground">
            Secure healthcare management system
          </p>
        </div>
        <Button
          onClick={() => navigate("/auth")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-lg"
        >
          Sign In / Sign Up
        </Button>
      </div>
    </div>
  );
};

export default Index;
