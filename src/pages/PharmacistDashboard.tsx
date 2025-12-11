import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { 
  Pill, 
  FileText, 
  Package, 
  AlertTriangle, 
  ArrowLeft,
  Clock,
  CheckCircle,
  Archive
} from "lucide-react";

const features = [
  {
    title: "Pending Prescriptions",
    description: "Process and dispense pending prescriptions",
    icon: FileText,
    color: "from-cyan-500 to-cyan-600",
  },
  {
    title: "Inventory",
    description: "Manage medication stock and inventory",
    icon: Package,
    color: "from-teal-500 to-teal-600",
  },
  {
    title: "Dispensed Today",
    description: "View today's dispensed medications",
    icon: CheckCircle,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Low Stock Alerts",
    description: "View medications with low stock",
    icon: AlertTriangle,
    color: "from-amber-500 to-amber-600",
  },
];

const stats = [
  { label: "Pending Orders", value: "18", icon: Clock },
  { label: "Dispensed Today", value: "45", icon: CheckCircle },
  { label: "Low Stock Items", value: "7", icon: AlertTriangle },
];

const PharmacistDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Pharmacist Dashboard</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-6 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <button
              key={feature.title}
              className="group bg-card border border-border rounded-xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/50 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PharmacistDashboard;
