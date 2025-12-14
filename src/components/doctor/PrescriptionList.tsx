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
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";

interface Prescription {
  id: string;
  patient_ref: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  patient_name?: string;
  patient_code?: string;
}

interface PrescriptionListProps {
  user: User;
  refreshTrigger: number;
}

const PrescriptionList = ({ user, refreshTrigger }: PrescriptionListProps) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    setLoading(true);
    
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

  const updateStatus = async (id: string, status: "completed" | "cancelled") => {
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

  if (loading) {
    return <div className="text-muted-foreground">Loading prescriptions...</div>;
  }

  if (prescriptions.length === 0) {
    return <div className="text-muted-foreground">No prescriptions found.</div>;
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
            <TableHead>Start Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prescriptions.map((prescription) => (
            <TableRow key={prescription.id}>
              <TableCell className="font-mono text-sm">
                {prescription.patient_code || "-"}
              </TableCell>
              <TableCell className="font-medium">{prescription.patient_name}</TableCell>
              <TableCell>{prescription.medication_name}</TableCell>
              <TableCell>{prescription.dosage}</TableCell>
              <TableCell>{prescription.frequency}</TableCell>
              <TableCell>{format(new Date(prescription.start_date), "MMM d, yyyy")}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(prescription.status)}>
                  {prescription.status}
                </Badge>
              </TableCell>
              <TableCell>
                {prescription.status === "active" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(prescription.id, "completed")}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400"
                      onClick={() => updateStatus(prescription.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PrescriptionList;