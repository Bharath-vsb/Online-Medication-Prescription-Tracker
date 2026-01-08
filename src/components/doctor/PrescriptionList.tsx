import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Download, Pill, History, CheckCircle } from "lucide-react";
import { generatePrescriptionPdf } from "@/lib/generatePrescriptionPdf";

interface Prescription {
  id: string;
  patient_ref: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  duration_days: number | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  patient_name?: string;
  patient_code?: string;
}

interface PrescriptionListProps {
  user: User;
  refreshTrigger: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
  once_morning: "Once a day (Morning)",
  once_afternoon: "Once a day (Afternoon)",
  once_night: "Once a day (Night)",
  twice_daily: "Twice a day",
  three_times_daily: "Three times a day",
  every_8_hours: "Every 8 hours",
};

const PrescriptionList = ({ user, refreshTrigger }: PrescriptionListProps) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");

  const fetchPrescriptions = async () => {
    setLoading(true);

    // Auto-complete expired prescriptions
    await supabase.rpc("auto_complete_expired_prescriptions");
    
    // First get the doctor's doctor_id
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("doctor_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!doctorData) {
      setLoading(false);
      setPrescriptions([]);
      return;
    }
    
    setDoctorId(doctorData.doctor_id);

    // Get doctor's name
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profileData) {
      setDoctorName(profileData.full_name);
    }

    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("doctor_ref", doctorData.doctor_id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load prescriptions");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      // Get patient_ref values
      const patientRefs = [...new Set(data.map((p) => p.patient_ref).filter(Boolean))];
      
      if (patientRefs.length > 0) {
        // Fetch patients
        const { data: patientsData } = await supabase
          .from("patients")
          .select("patient_id, user_id")
          .in("patient_id", patientRefs);

        if (patientsData) {
          const userIds = patientsData.map((p) => p.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, patient_id")
            .in("id", userIds);

          const profileMap = new Map(
            profiles?.map((p) => [p.id, { name: p.full_name, code: p.patient_id }]) || []
          );
          
          const patientMap = new Map(
            patientsData.map((p) => [
              p.patient_id, 
              profileMap.get(p.user_id) || { name: "Unknown", code: "" }
            ])
          );

          const prescriptionsWithNames = data.map((p) => ({
            ...p,
            patient_name: patientMap.get(p.patient_ref)?.name || "Unknown Patient",
            patient_code: patientMap.get(p.patient_ref)?.code || "",
          }));

          setPrescriptions(prescriptionsWithNames);
        } else {
          setPrescriptions(data);
        }
      } else {
        setPrescriptions(data);
      }
    } else {
      setPrescriptions([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [user.id, refreshTrigger]);

  const updateStatus = async (id: string, status: "completed" | "cancelled", prescription: Prescription) => {
    // Prevent modifying completed prescriptions
    if (prescription.status === "completed") {
      toast.error("Cannot modify completed prescriptions");
      return;
    }

    const { error } = await supabase
      .from("prescriptions")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update prescription");
    } else {
      toast.success(`Prescription marked as ${status}`);
      fetchPrescriptions();
    }
  };

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

  const handleDownloadPdf = (prescription: Prescription) => {
    generatePrescriptionPdf({
      patientName: prescription.patient_name || "Unknown",
      patientId: prescription.patient_code || "N/A",
      doctorName: doctorName,
      medicationName: prescription.medication_name,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      startDate: format(new Date(prescription.start_date), "MMM d, yyyy"),
      endDate: prescription.end_date ? format(new Date(prescription.end_date), "MMM d, yyyy") : undefined,
      status: prescription.status,
    });
  };

  const activePrescriptions = prescriptions.filter((p) => p.status === "active");
  const historyPrescriptions = prescriptions.filter((p) => p.status !== "active");

  if (loading) {
    return <div className="text-muted-foreground">Loading prescriptions...</div>;
  }

  const PrescriptionTable = ({ items, showActions }: { items: Prescription[]; showActions: boolean }) => {
    if (items.length === 0) {
      return (
        <div className="text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
          <Pill className="w-12 h-12 opacity-50" />
          <p>No prescriptions found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Medication</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead>Actions</TableHead>}
              <TableHead>Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((prescription) => (
              <TableRow key={prescription.id} className={!showActions ? "opacity-75" : ""}>
                <TableCell className="font-mono text-sm">
                  {prescription.patient_code || "-"}
                </TableCell>
                <TableCell className="font-medium">{prescription.patient_name}</TableCell>
                <TableCell>{prescription.medication_name}</TableCell>
                <TableCell>{prescription.dosage}</TableCell>
                <TableCell>{FREQUENCY_LABELS[prescription.frequency] || prescription.frequency}</TableCell>
                <TableCell>{prescription.duration_days ? `${prescription.duration_days} days` : "-"}</TableCell>
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
                {showActions && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(prescription.id, "completed", prescription)}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => updateStatus(prescription.id, "cancelled", prescription)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPdf(prescription)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <Pill className="w-4 h-4" />
          Active Prescriptions ({activePrescriptions.length})
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Prescription History ({historyPrescriptions.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <PrescriptionTable items={activePrescriptions} showActions={true} />
      </TabsContent>
      <TabsContent value="history">
        <div className="bg-muted/30 rounded-lg p-4 mb-4 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 inline mr-2" />
          These prescriptions are completed or cancelled and shown for your records only.
        </div>
        <PrescriptionTable items={historyPrescriptions} showActions={false} />
      </TabsContent>
    </Tabs>
  );
};

export default PrescriptionList;