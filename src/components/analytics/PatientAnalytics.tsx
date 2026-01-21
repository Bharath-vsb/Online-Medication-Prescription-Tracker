import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Pill, TrendingUp, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface PatientAnalyticsProps {
  user: User;
}

interface PrescriptionHistory {
  id: string;
  medicine_name: string;
  prescribed_date: string;
}

interface WeeklyData {
  week: string;
  adherence: number;
}

const PatientAnalytics = ({ user }: PatientAnalyticsProps) => {
  const [adherencePercentage, setAdherencePercentage] = useState(0);
  const [adherenceChange, setAdherenceChange] = useState(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [prescriptionHistory, setPrescriptionHistory] = useState<PrescriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get patient_id
        const { data: patientData } = await supabase
          .from("patients")
          .select("patient_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!patientData) {
          setLoading(false);
          return;
        }

        // Fetch prescriptions for this patient
        const { data: prescriptions } = await supabase
          .from("prescriptions")
          .select("id, medication_name, start_date, end_date, status, created_at, is_sold")
          .eq("patient_ref", patientData.patient_id)
          .order("created_at", { ascending: false });

        // Fetch dose confirmations to calculate actual adherence
        const { data: confirmations } = await supabase
          .from("dose_confirmations")
          .select("*")
          .eq("patient_id", patientData.patient_id);

        // Calculate adherence based on confirmed vs total confirmations
        const totalConfirmations = confirmations?.length || 0;
        const confirmedDoses = confirmations?.filter(c => c.status === "confirmed")?.length || 0;
        const missedDoses = confirmations?.filter(c => c.status === "missed")?.length || 0;
        
        let adherence = 85; // Default
        if (totalConfirmations > 0) {
          adherence = Math.round((confirmedDoses / totalConfirmations) * 100);
        }
        setAdherencePercentage(adherence);

        // Calculate adherence change (compare last 15 days vs previous 15 days)
        const now = new Date();
        const fifteenDaysAgo = subDays(now, 15);
        const thirtyDaysAgo = subDays(now, 30);

        const recentConfirmations = confirmations?.filter(c => new Date(c.scheduled_date) >= fifteenDaysAgo) || [];
        const olderConfirmations = confirmations?.filter(c => {
          const date = new Date(c.scheduled_date);
          return date >= thirtyDaysAgo && date < fifteenDaysAgo;
        }) || [];

        const recentAdherence = recentConfirmations.length > 0 
          ? (recentConfirmations.filter(c => c.status === "confirmed").length / recentConfirmations.length) * 100 
          : adherence;
        const olderAdherence = olderConfirmations.length > 0 
          ? (olderConfirmations.filter(c => c.status === "confirmed").length / olderConfirmations.length) * 100 
          : adherence;
        
        const change = Math.round(recentAdherence - olderAdherence);
        setAdherenceChange(change);

        // Generate weekly data for the chart based on actual confirmations
        const weeks: WeeklyData[] = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = startOfWeek(subDays(new Date(), i * 7));
          const weekEnd = endOfWeek(subDays(new Date(), i * 7));
          
          const weekConfirmations = confirmations?.filter(c => {
            const date = new Date(c.scheduled_date);
            return date >= weekStart && date <= weekEnd;
          }) || [];
          
          const confirmed = weekConfirmations.filter(c => c.status === "confirmed").length;
          const total = weekConfirmations.length;
          
          weeks.push({
            week: `Week ${4 - i}`,
            adherence: total > 0 ? Math.round((confirmed / total) * 100) : adherence
          });
        }
        setWeeklyData(weeks);

        // Set prescription history
        const history: PrescriptionHistory[] = (prescriptions || []).slice(0, 10).map(p => ({
          id: p.id,
          medicine_name: p.medication_name,
          prescribed_date: p.start_date
        }));
        setPrescriptionHistory(history);

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
      {/* Adherence Card */}
      <div className="bg-secondary/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Medication Adherence</h3>
        <div className="flex items-baseline gap-4">
          <span className="text-5xl font-bold text-primary">{adherencePercentage}%</span>
          <div className="flex items-center gap-1">
            <TrendingUp className={`w-4 h-4 ${adherenceChange >= 0 ? 'text-primary' : 'text-destructive'}`} />
            <span className={`text-sm ${adherenceChange >= 0 ? 'text-primary' : 'text-destructive'}`}>
              Last 30 Days {adherenceChange >= 0 ? '+' : ''}{adherenceChange}%
            </span>
          </div>
        </div>
      </div>

      {/* Adherence Trend Chart */}
      <div className="bg-secondary/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Adherence Trends</h3>
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
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number) => [`${Math.round(value)}%`, 'Adherence']}
              />
              <Line 
                type="monotone" 
                dataKey="adherence" 
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

      {/* Prescription History */}
      <div className="bg-secondary/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Prescription History</h3>
        <div className="space-y-3">
          {prescriptionHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No prescription history</p>
          ) : (
            prescriptionHistory.map((prescription) => (
              <div 
                key={prescription.id} 
                className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Pill className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{prescription.medicine_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(prescription.prescribed_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientAnalytics;
