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
  patient_id: string;
  user_id: string;
  full_name: string;
  patient_code: string | null;
}

interface Medication {
  id: string;
  name: string;
  category: string | null;
  default_dosage: string | null;
}

interface PrescriptionFormProps {
  user: User;
  onSuccess: () => void;
}

const PrescriptionForm = ({ user, onSuccess }: PrescriptionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedMedication, setSelectedMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch doctor's doctor_id
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("doctor_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (doctorData) {
        setDoctorId(doctorData.doctor_id);
      }

      // Fetch patients with their profiles
      const { data: patientsData } = await supabase
        .from("patients")
        .select("patient_id, user_id");

      if (patientsData && patientsData.length > 0) {
        const userIds = patientsData.map((p) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, patient_id")
          .in("id", userIds);

        if (profiles) {
          const profileMap = new Map(profiles.map((p) => [p.id, { name: p.full_name, code: p.patient_id }]));
          const patientsWithNames = patientsData.map((p) => ({
            patient_id: p.patient_id,
            user_id: p.user_id,
            full_name: profileMap.get(p.user_id)?.name || "Unknown",
            patient_code: profileMap.get(p.user_id)?.code || null,
          }));
          setPatients(patientsWithNames);
        }
      }

      // Fetch medications
      const { data: medsData } = await supabase
        .from("medications")
        .select("id, name, category, default_dosage")
        .order("category", { ascending: true });

      if (medsData) {
        setMedications(medsData);
      }
    };

    fetchData();
  }, [user.id]);

  const handleMedicationChange = (medicationId: string) => {
    setSelectedMedication(medicationId);
    const med = medications.find((m) => m.id === medicationId);
    if (med?.default_dosage) {
      setDosage(med.default_dosage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorId) {
      toast.error("Doctor record not found. Please contact support.");
      return;
    }

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (!selectedMedication) {
      toast.error("Please select a medication");
      return;
    }

    if (!dosage.trim()) {
      toast.error("Please enter dosage");
      return;
    }

    if (!frequency.trim()) {
      toast.error("Please enter frequency");
      return;
    }

    if (!startDate) {
      toast.error("Please select start date");
      return;
    }

    if (!endDate) {
      toast.error("Please select end date");
      return;
    }

    if (!instructions.trim()) {
      toast.error("Please enter instructions");
      return;
    }

    const medication = medications.find((m) => m.id === selectedMedication);
    const patient = patients.find((p) => p.patient_id === selectedPatient);

    setLoading(true);

    const { error } = await supabase.from("prescriptions").insert({
      patient_id: patient?.user_id || "",
      doctor_id: user.id,
      patient_ref: selectedPatient,
      doctor_ref: doctorId,
      medication_name: medication?.name || "",
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      start_date: startDate,
      end_date: endDate,
      instructions: instructions.trim(),
    });

    setLoading(false);

    if (error) {
      console.error("Prescription error:", error);
      toast.error("Failed to create prescription");
    } else {
      toast.success("Prescription created successfully");
      setSelectedPatient("");
      setSelectedMedication("");
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
        <Label htmlFor="patient">Select Patient <span className="text-destructive">*</span></Label>
        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
          <SelectTrigger>
            <SelectValue placeholder="Select a patient" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.patient_id} value={patient.patient_id}>
                {patient.patient_code ? `${patient.patient_code} - ` : ""}{patient.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="medication">Select Medication <span className="text-destructive">*</span></Label>
          <Select value={selectedMedication} onValueChange={handleMedicationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a medication" />
            </SelectTrigger>
            <SelectContent>
              {medications.map((med) => (
                <SelectItem key={med.id} value={med.id}>
                  {med.name} {med.category ? `(${med.category})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="dosage">Dosage <span className="text-destructive">*</span></Label>
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
          <Label htmlFor="frequency">Frequency <span className="text-destructive">*</span></Label>
          <Input
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g., Twice daily"
            required
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date <span className="text-destructive">*</span></Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="instructions">Instructions <span className="text-destructive">*</span></Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Special instructions for the patient"
          rows={3}
          required
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create Prescription"}
      </Button>
    </form>
  );
};

export default PrescriptionForm;