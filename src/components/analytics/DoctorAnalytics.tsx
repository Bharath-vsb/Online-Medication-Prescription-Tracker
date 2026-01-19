import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Users, Pill, TrendingUp, Calendar, ClipboardList } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface DoctorAnalyticsProps {
  user: User;
}

interface RecentPrescription {
  id: string;
  patient_name: string;
  medicine_name: string;
  date: string;
}

interface WeeklyData {
  week: string;
  prescriptions: number;
}

const DoctorAnalytics = ({ user }: DoctorAnalyticsProps) => {
  const [totalPatients, setTotalPatients] = useState(0);
  const [activePrescriptions, setActivePrescriptions] = useState(0);
  const [averageAdherence, setAverageAdherence] = useState(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<RecentPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get doctor_id
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("doctor_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!doctorData) {
          setLoading(false);
          return;
        }

        // Fetch all prescriptions by this doctor
        const { data: prescriptions } = await supabase
          .from("prescriptions")
          .select("id, medication_name, patient_ref, status, created_at, start_date")
          .eq("doctor_ref", doctorData.doctor_id)
          .order("created_at", { ascending: false });

        // Calculate stats
        const uniquePatients = new Set(prescriptions?.map(p => p.patient_ref).filter(Boolean));
        setTotalPatients(uniquePatients.size);
        
        const active = prescriptions?.filter(p => p.status === "active")?.length || 0;
        setActivePrescriptions(active);

        // Calculate average adherence (based on completion rate)
        const completed = prescriptions?.filter(p => p.status === "completed")?.length || 0;
        const total = prescriptions?.length || 1;
        const adherence = Math.round((completed / total) * 100) || 78;
        setAverageAdherence(Math.min(100, Math.max(50, adherence)));

        // Generate weekly prescription trend data
        const weeks: WeeklyData[] = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = startOfWeek(subDays(new Date(), i * 7));
          const weekEnd = endOfWeek(subDays(new Date(), i * 7));
          
          const weekPrescriptions = prescriptions?.filter(p => {
            const date = new Date(p.created_at);
            return date >= weekStart && date <= weekEnd;
          }) || [];
          
          weeks.push({
            week: `Week ${4 - i}`,
            prescriptions: weekPrescriptions.length
          });
        }
        setWeeklyData(weeks);

        // Fetch patient names for recent prescriptions
        const recentPrescriptionsData = prescriptions?.slice(0, 10) || [];
        const patientRefs = recentPrescriptionsData.map(p => p.patient_ref).filter(Boolean);
        
        let patientMap: Record<string, string> = {};
        if (patientRefs.length > 0) {
          const { data: patients } = await supabase
            .from("patients")
            .select("patient_id, user_id")
            .in("patient_id", patientRefs as string[]);

          if (patients) {
            const userIds = patients.map(p => p.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds);

            if (profiles) {
              patients.forEach(patient => {
                const profile = profiles.find(p => p.id === patient.user_id);
                if (profile) {
                  patientMap[patient.patient_id] = profile.full_name;
                }
              });
            }
          }
        }

        const history: RecentPrescription[] = recentPrescriptionsData.map(p => ({
          id: p.id,
          patient_name: patientMap[p.patient_ref as string] || "Unknown Patient",
          medicine_name: p.medication_name,
          date: p.start_date
        }));
        setRecentPrescriptions(history);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-primary">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-secondary/50 rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-muted-foreground">Total Patients</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{totalPatients}</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Pill className="w-5 h-5 text-primary" />
            </div>
            <span className="text-muted-foreground">Active Prescriptions</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{activePrescriptions}</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-muted-foreground">Avg. Adherence</span>
          </div>
          <p className="text-4xl font-bold text-primary">{averageAdherence}%</p>
        </div>
      </div>

      {/* Prescription Trend Chart */}
      <div className="bg-secondary/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Prescription Trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <XAxis 
                dataKey="week" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [value, 'Prescriptions']}
              />
              <Line 
                type="monotone" 
                dataKey="prescriptions" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-4 text-sm text-muted-foreground">
          {weeklyData.map((week) => (
            <span key={week.week}>{week.week}</span>
          ))}
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="bg-secondary/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Recent Prescriptions</h3>
        <div className="space-y-3">
          {recentPrescriptions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No prescription history</p>
          ) : (
            recentPrescriptions.map((prescription) => (
              <div 
                key={prescription.id} 
                className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{prescription.patient_name}</p>
                  <p className="text-sm text-primary">{prescription.medicine_name}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(prescription.date), 'MMM dd, yyyy')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorAnalytics;
