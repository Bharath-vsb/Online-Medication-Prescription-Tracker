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
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  patient_name?: string;
}

interface PrescriptionListProps {
  user: User;
  refreshTrigger: number;
}

const PrescriptionList = ({ user, refreshTrigger }: PrescriptionListProps) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load prescriptions");
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      const patientIds = [...new Set(data.map((p) => p.patient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", patientIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
      
      const prescriptionsWithNames = data.map((p) => ({
        ...p,
        patient_name: profileMap.get(p.patient_id) || "Unknown Patient",
      }));

      setPrescriptions(prescriptionsWithNames);
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
            <TableHead>Patient</TableHead>
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
