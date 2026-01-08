import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Stethoscope, 
  Pill,
  Clock, 
  UserCheck,
  ClipboardList,
  LogOut,
  User as UserIcon,
  Plus
} from "lucide-react";
import ProfileSetup from "@/components/ProfileSetup";
import PrescriptionForm from "@/components/doctor/PrescriptionForm";
import PrescriptionList from "@/components/doctor/PrescriptionList";

const DoctorDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    active: 0,
    patientsTreated: 0,
    completed: 0
  });
  const navigate = useNavigate();

  // Fetch prescription stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      // First get the doctor's doctor_id
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("doctor_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!doctorData) return;

      const { data } = await supabase
        .from("prescriptions")
        .select("status, patient_ref")
        .eq("doctor_ref", doctorData.doctor_id);
      
      if (data) {
        const uniquePatients = new Set(data.map(p => p.patient_ref).filter(Boolean));
        setStats({
          active: data.filter(p => p.status === "active").length,
          patientsTreated: uniquePatients.size,
          completed: data.filter(p => p.status === "completed").length
        });
      }
    };
    
    fetchStats();
  }, [user, refreshTrigger]);

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
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
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
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{stats.patientsTreated}</p>
              <p className="text-muted-foreground text-sm">Patients Treated</p>
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
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="new-prescription" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Prescription
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prescriptions">
            <div className="bg-card border border-border rounded-xl p-6">
              <PrescriptionList user={user} refreshTrigger={refreshTrigger} />
            </div>
          </TabsContent>

          <TabsContent value="new-prescription">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Create New Prescription</h2>
              <PrescriptionForm 
                user={user} 
                onSuccess={() => {
                  setRefreshTrigger((prev) => prev + 1);
                  setActiveTab("prescriptions");
                }} 
              />
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSetup user={user} role="doctor" onProfileComplete={() => {}} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DoctorDashboard;
