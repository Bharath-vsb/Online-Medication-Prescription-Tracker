import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Pill, 
  Clock,
  Bell,
  LogOut,
  User as UserIcon,
  BarChart3
} from "lucide-react";
import ProfileSetup from "@/components/ProfileSetup";
import PatientPrescriptions from "@/components/patient/PatientPrescriptions";
import MedicationReminders from "@/components/patient/MedicationReminders";
import PatientAnalytics from "@/components/analytics/PatientAnalytics";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

const PatientDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    cancelled: 0
  });
  const [patientId, setPatientId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Enable in-app notifications
  useReminderNotifications(patientId);

  // Fetch prescription stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      // First get the patient's patient_id
      const { data: patientData } = await supabase
        .from("patients")
        .select("patient_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!patientData) return;

      setPatientId(patientData.patient_id);

      const { data } = await supabase
        .from("prescriptions")
        .select("status")
        .eq("patient_ref", patientData.patient_id);
      
      if (data) {
        setStats({
          active: data.filter(p => p.status === "active").length,
          completed: data.filter(p => p.status === "completed").length,
          cancelled: data.filter(p => p.status === "cancelled").length
        });
      }
    };
    
    fetchStats();
  }, [user]);

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
          <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Pill className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.active}</p>
              <p className="text-muted-foreground text-sm">Active Prescriptions</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.completed}</p>
              <p className="text-muted-foreground text-sm">Completed</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.cancelled}</p>
              <p className="text-muted-foreground text-sm">Cancelled</p>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              My Prescriptions
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions">
            <div className="bg-card border border-border rounded-xl p-6">
              <PatientPrescriptions user={user} />
            </div>
          </TabsContent>

          <TabsContent value="reminders">
            <div className="bg-card border border-border rounded-xl p-6">
              <MedicationReminders user={user} />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Analytics</h2>
              <PatientAnalytics user={user} />
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSetup user={user} role="patient" onProfileComplete={() => {}} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PatientDashboard;
