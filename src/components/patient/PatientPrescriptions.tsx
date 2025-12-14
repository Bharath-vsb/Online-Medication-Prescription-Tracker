import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { Pill, History } from "lucide-react";

interface Prescription {
  id: string;
  doctor_ref: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  doctor_name?: string;
}

interface PatientPrescriptionsProps {
  user: User;
}

const PatientPrescriptions = ({ user }: PatientPrescriptionsProps) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      // First get the patient's patient_id
      const { data: patientData } = await supabase
        .from("patients")
        .select("patient_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!patientData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_ref", patientData.patient_id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load prescriptions");
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Get doctor_ref values
        const doctorRefs = [...new Set(data.map((p) => p.doctor_ref).filter(Boolean))];
        
        if (doctorRefs.length > 0) {
          // Fetch doctors
          const { data: doctorsData } = await supabase
            .from("doctors")
            .select("doctor_id, user_id")
            .in("doctor_id", doctorRefs);

          if (doctorsData) {
            const userIds = doctorsData.map((d) => d.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds);

            const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
            const doctorMap = new Map(
              doctorsData.map((d) => [d.doctor_id, profileMap.get(d.user_id) || "Unknown"])
            );

            const prescriptionsWithNames = data.map((p) => ({
              ...p,
              doctor_name: doctorMap.get(p.doctor_ref) || "Unknown Doctor",
            }));

            setPrescriptions(prescriptionsWithNames);
          } else {
            setPrescriptions(data);
          }
        } else {
          setPrescriptions(data);
        }
      }

      setLoading(false);
    };

    fetchPrescriptions();
  }, [user.id]);

  const activePrescriptions = prescriptions.filter((p) => p.status === "active");
  const historyPrescriptions = prescriptions.filter((p) => p.status !== "active");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "";
    }
  };

  const PrescriptionTable = ({ items }: { items: Prescription[] }) => {
    if (items.length === 0) {
      return <div className="text-muted-foreground py-8 text-center">No prescriptions found.</div>;
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medication</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((prescription) => (
              <TableRow key={prescription.id}>
                <TableCell className="font-medium">{prescription.medication_name}</TableCell>
                <TableCell>{prescription.dosage}</TableCell>
                <TableCell>{prescription.frequency}</TableCell>
                <TableCell>{prescription.doctor_name}</TableCell>
                <TableCell>{format(new Date(prescription.start_date), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  {prescription.end_date
                    ? format(new Date(prescription.end_date), "MMM d, yyyy")
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(prescription.status)}>
                    {prescription.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading prescriptions...</div>;
  }

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <Pill className="w-4 h-4" />
          Active ({activePrescriptions.length})
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          History ({historyPrescriptions.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <PrescriptionTable items={activePrescriptions} />
      </TabsContent>
      <TabsContent value="history">
        <PrescriptionTable items={historyPrescriptions} />
      </TabsContent>
    </Tabs>
  );
};

export default PatientPrescriptions;