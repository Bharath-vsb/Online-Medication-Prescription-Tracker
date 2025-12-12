import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

interface Patient {
  id: string;
  full_name: string;
  patient_id: string | null;
}
interface PrescriptionFormProps {
  user: User;
  onSuccess: () => void;
}

const PrescriptionForm = ({ user, onSuccess }: PrescriptionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "patient");

      if (data && data.length > 0) {
        const patientIds = data.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, patient_id")
          .in("id", patientIds);

        if (profiles) {
          setPatients(profiles);
        }
      }
    };

    fetchPatients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId) {
      toast.error("Please select a patient");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("prescriptions").insert({
      patient_id: patientId,
      doctor_id: user.id,
      medication_name: medicationName.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      start_date: startDate,
      end_date: endDate || null,
      instructions: instructions.trim() || null,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create prescription");
    } else {
      toast.success("Prescription created successfully");
      setPatientId("");
      setMedicationName("");
      setDosage("");
      setFrequency("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setInstructions("");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="patient">Select Patient</Label>
        <Select value={patientId} onValueChange={setPatientId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.patient_id ? `${patient.patient_id} - ` : ""}{patient.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="medication">Medication Name</Label>
          <Input
            id="medication"
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            placeholder="Enter medication name"
            required
          />
        </div>
        <div>
          <Label htmlFor="dosage">Dosage</Label>
          <Input
            id="dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="e.g., 500mg"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <Input
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g., Twice daily"
            required
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date (Optional)</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Special instructions for the patient"
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Prescription"}
      </Button>
    </form>
  );
};

export default PrescriptionForm;
