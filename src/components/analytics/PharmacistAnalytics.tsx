import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Package, AlertTriangle, ShoppingCart, TrendingUp, Calendar, Pill } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface PharmacistAnalyticsProps {
  user: User;
}

interface SaleHistory {
  id: string;
  patient_name: string;
  medicine_name: string;
  sold_date: string;
}

interface WeeklyData {
  week: string;
  sales: number;
}

const PharmacistAnalytics = ({ user }: PharmacistAnalyticsProps) => {
  const [totalMedicines, setTotalMedicines] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch inventory stats
        const { data: inventory } = await supabase
          .from("inventory")
          .select("*");

        const total = inventory?.length || 0;
        setTotalMedicines(total);

        const lowStock = inventory?.filter(item => item.stock_quantity <= item.min_stock_threshold)?.length || 0;
        setLowStockCount(lowStock);

        // Fetch sold prescriptions (monthly)
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
        const { data: soldPrescriptions } = await supabase
          .from("prescriptions")
          .select("id, medication_name, patient_ref, updated_at, is_sold")
          .eq("is_sold", true)
          .gte("updated_at", thirtyDaysAgo)
          .order("updated_at", { ascending: false });

        setSoldCount(soldPrescriptions?.length || 0);

        // Generate weekly sales trend data
        const weeks: WeeklyData[] = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = startOfWeek(subDays(new Date(), i * 7));
          const weekEnd = endOfWeek(subDays(new Date(), i * 7));
          
          const weekSales = soldPrescriptions?.filter(p => {
            const date = new Date(p.updated_at);
            return date >= weekStart && date <= weekEnd;
          }) || [];
          
          weeks.push({
            week: `Week ${4 - i}`,
            sales: weekSales.length
          });
        }
        setWeeklyData(weeks);

        // Fetch patient names for sales history
        const recentSales = soldPrescriptions?.slice(0, 10) || [];
        const patientRefs = recentSales.map(p => p.patient_ref).filter(Boolean);
        
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

        const history: SaleHistory[] = recentSales.map(p => ({
          id: p.id,
          patient_name: patientMap[p.patient_ref as string] || "Unknown Patient",
          medicine_name: p.medication_name,
          sold_date: p.updated_at
        }));
        setSalesHistory(history);

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
              <Package className="w-5 h-5 text-primary" />
            </div>
            <span className="text-muted-foreground">Total Medicines</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{totalMedicines}</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-muted-foreground">Low Stock</span>
          </div>
          <p className="text-4xl font-bold text-amber-500">{lowStockCount}</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <span className="text-muted-foreground">Sold (Monthly)</span>
          </div>
          <p className="text-4xl font-bold text-primary">{soldCount}</p>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-secondary/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Sales Trend</h3>
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
                formatter={(value: number) => [value, 'Sales']}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
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

      {/* Sales History */}
      <div className="bg-secondary/50 rounded-xl p-6 border border-border">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Selling History</h3>
        <div className="space-y-3">
          {salesHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sales history</p>
          ) : (
            salesHistory.map((sale) => (
              <div 
                key={sale.id} 
                className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Pill className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{sale.patient_name}</p>
                  <p className="text-sm text-primary">{sale.medicine_name}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(sale.sold_date), 'MMM dd, yyyy')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacistAnalytics;
