import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { 
  Users, 
  Calendar, 
  FileText, 
  Pill, 
  Clock,
  Activity,
  LogOut
} from "lucide-react";

const features = [
  {
    title: "Book Appointment",
    description: "Schedule a new appointment with a doctor",
    icon: Calendar,
    color: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Medical History",
    description: "View your complete medical records",
    icon: FileText,
    color: "from-teal-500 to-teal-600",
  },
  {
    title: "Prescriptions",
    description: "View and manage your prescriptions",
    icon: Pill,
    color: "from-cyan-500 to-cyan-600",
  },
  {
    title: "Health Vitals",
    description: "Track your health vitals and metrics",
    icon: Activity,
    color: "from-rose-500 to-rose-600",
  },
];

const stats = [
  { label: "Upcoming Appointments", value: "2", icon: Calendar },
  { label: "Active Prescriptions", value: "3", icon: Pill },
  { label: "Last Checkup", value: "15 days", icon: Clock },
];

const PatientDashboard = () => {
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Patient Dashboard</h1>
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

export default PatientDashboard;
