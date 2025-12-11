import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { Stethoscope, Users, Pill, Shield, LogOut } from "lucide-react";

const modules = [
  {
    title: "Doctor",
    description: "Manage appointments, patient records, and medical consultations",
    icon: Stethoscope,
    color: "from-teal-500 to-teal-600",
    path: "/doctor",
  },
  {
    title: "Patient",
    description: "View medical history, book appointments, and access prescriptions",
    icon: Users,
    color: "from-emerald-500 to-emerald-600",
    path: "/patient",
  },
  {
    title: "Pharmacist",
    description: "Process prescriptions, manage inventory, and dispense medications",
    icon: Pill,
    color: "from-cyan-500 to-cyan-600",
    path: "/pharmacist",
  },
  {
    title: "Admin",
    description: "System administration, user management, and analytics",
    icon: Shield,
    color: "from-slate-500 to-slate-600",
    path: "/admin",
  },
];

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-xl text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6">
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
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Medical Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">{user.email}</span>
            <Button
              onClick={handleSignOut}
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
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
          <p className="text-muted-foreground">Select a module to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <button
              key={module.title}
              onClick={() => navigate(module.path)}
              className="group bg-card border border-border rounded-xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <module.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{module.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{module.description}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
