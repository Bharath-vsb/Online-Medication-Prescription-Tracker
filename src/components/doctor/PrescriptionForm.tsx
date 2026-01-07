import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import MedicineSelect from "./MedicineSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { AlertTriangle, Package, Info } from "lucide-react";

// Predefined frequency options with default reminder times
const FREQUENCY_OPTIONS = [
  { value: "once_morning", label: "Once a day (Morning)", times: ["08:00"], doses: 1 },
  { value: "once_afternoon", label: "Once a day (Afternoon)", times: ["13:00"], doses: 1 },
  { value: "once_night", label: "Once a day (Night)", times: ["20:00"], doses: 1 },
  { value: "twice_daily", label: "Twice a day (Morning, Night)", times: ["08:00", "20:00"], doses: 2 },
  { value: "three_times_daily", label: "Three times a day (Morning, Afternoon, Night)", times: ["08:00", "13:00", "20:00"], doses: 3 },
  { value: "every_8_hours", label: "Every 8 hours", times: ["06:00", "14:00", "22:00"], doses: 3 },
];

interface Patient {
  patient_id: string;
  user_id: string;
  full_name: string;
  patient_code: string | null;
}

interface PrescriptionFormProps {
  user: User;
  onSuccess: () => void;
}

const PrescriptionForm = ({ user, onSuccess }: PrescriptionFormProps) => {
  const today = new Date().toISOString().split("T")[0];
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [medicineInInventory, setMedicineInInventory] = useState(false);
  const [medicineStock, setMedicineStock] = useState(0);
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dateError, setDateError] = useState("");
  const [stockWarning, setStockWarning] = useState("");

  // Auto-calculate end date when start date or duration changes
  useEffect(() => {
    if (startDate && durationDays && typeof durationDays === "number" && durationDays > 0) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + durationDays - 1);
      setEndDate(end.toISOString().split("T")[0]);
    } else {
      setEndDate("");
    }
  }, [startDate, durationDays]);

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    // Fetch doctor's doctor_id and name
    const { data: doctorData } = await supabase
      .from("doctors")
      .select("doctor_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (doctorData) {
      setDoctorId(doctorData.doctor_id);
    }

    // Get doctor's name from profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileData) {
      setDoctorName(profileData.full_name);
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
  };

  const calculateRequiredQuantity = (freq: string, duration: number): number => {
    if (!duration || duration <= 0) return 0;
    const freqOption = FREQUENCY_OPTIONS.find(f => f.value === freq);
    const dosesPerDay = freqOption?.doses || 1;
    return duration * dosesPerDay;
  };

  const validateStock = () => {
    if (!selectedMedicine || !frequency || !durationDays || !medicineInInventory) {
      setStockWarning("");
      return;
    }

    const required = calculateRequiredQuantity(frequency, typeof durationDays === "number" ? durationDays : 0);
    if (medicineStock < required) {
      setStockWarning(`Insufficient stock. Required: ${required}, Available: ${medicineStock}`);
    } else {
      setStockWarning("");
    }
  };

  useEffect(() => {
    validateStock();
  }, [selectedMedicine, frequency, durationDays, medicineStock, medicineInInventory]);

  const handleMedicineChange = (name: string, inInventory: boolean, stockQty: number) => {
    setSelectedMedicine(name);
    setMedicineInInventory(inInventory);
    setMedicineStock(stockQty);
    setStockWarning("");
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

    if (!selectedMedicine) {
      toast.error("Please select a medicine");
      return;
    }

    if (!dosage.trim()) {
      toast.error("Please enter dosage");
      return;
    }

    if (!frequency.trim()) {
      toast.error("Please select frequency");
      return;
    }

    if (!startDate) {
      toast.error("Please select start date");
      return;
    }

    const currentDate = new Date().toISOString().split("T")[0];
    if (startDate < currentDate) {
      toast.error("Past dates are not allowed. Please select today or a future date.");
      return;
    }

    if (!durationDays || typeof durationDays !== "number" || durationDays <= 0) {
      toast.error("Please enter a valid duration (number of days)");
      return;
    }

    // Validate stock availability only if medicine is in inventory
    if (medicineInInventory) {
      const requiredQty = calculateRequiredQuantity(frequency, durationDays);
      if (medicineStock < requiredQty) {
        toast.error(`Insufficient stock. Required: ${requiredQty}, Available: ${medicineStock}`);
        return;
      }
    }

    if (!instructions.trim()) {
      toast.error("Please enter instructions");
      return;
    }

    const patient = patients.find((p) => p.patient_id === selectedPatient);

    setLoading(true);

    const { error } = await supabase.from("prescriptions").insert({
      patient_id: patient?.user_id || "",
      doctor_id: user.id,
      patient_ref: selectedPatient,
      doctor_ref: doctorId,
      medication_name: selectedMedicine,
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      start_date: startDate,
      end_date: endDate,
      duration_days: durationDays,
      instructions: instructions.trim(),
    });

    setLoading(false);

    if (error) {
      console.error("Prescription error:", error);
      if (error.message.includes("Insufficient stock")) {
        toast.error("Insufficient stock or medicine not available. Please select a different medicine.");
      } else {
        toast.error("Failed to create prescription");
      }
    } else {
      const message = medicineInInventory 
        ? "Prescription created successfully. Stock has been updated."
        : "Prescription created. Note: Medicine is not currently in inventory.";
      toast.success(message);
      setSelectedPatient("");
      setSelectedMedicine("");
      setMedicineInInventory(false);
      setMedicineStock(0);
      setDosage("");
      setFrequency("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setDurationDays("");
      setEndDate("");
      setInstructions("");
      setStockWarning("");
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="patient">Select Patient <span className="text-destructive">*</span></Label>
        <SearchableSelect
          options={patients.map((patient) => ({
            value: patient.patient_id,
            label: `${patient.patient_code ? `${patient.patient_code} - ` : ""}${patient.full_name}`,
          }))}
          value={selectedPatient}
          onValueChange={setSelectedPatient}
          placeholder="Select a patient"
          searchPlaceholder="Search patients..."
          emptyMessage="No patients found."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="medicine">Select Medicine <span className="text-destructive">*</span></Label>
          <MedicineSelect
            value={selectedMedicine}
            onValueChange={handleMedicineChange}
            userId={user.id}
            userName={doctorName}
          />
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

      {selectedMedicine && !medicineInInventory && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-600" />
          <span className="text-sm text-amber-700">
            This medicine is not currently in inventory. Pharmacist has been notified to add it.
          </span>
        </div>
      )}

      {selectedMedicine && medicineInInventory && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm">
          <div className="flex items-center gap-4">
            <span><strong>Available Stock:</strong> {medicineStock} units</span>
            {frequency && durationDays && (
              <span>
                <strong>Required:</strong> {calculateRequiredQuantity(frequency, typeof durationDays === "number" ? durationDays : 0)} units
              </span>
            )}
          </div>
        </div>
      )}

      {stockWarning && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{stockWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="frequency">Frequency <span className="text-destructive">*</span></Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => {
              const selectedDate = e.target.value;
              if (selectedDate < today) {
                setDateError("Past dates are not allowed. Please select today or a future date.");
              } else {
                setDateError("");
                setStartDate(selectedDate);
              }
            }}
            required
          />
          {dateError && <p className="text-destructive text-sm mt-1">{dateError}</p>}
        </div>
        <div>
          <Label htmlFor="durationDays">Duration (Days) <span className="text-destructive">*</span></Label>
          <Input
            id="durationDays"
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : "")}
            placeholder="e.g., 7"
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date (Auto-calculated)</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            disabled
            className="bg-muted"
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

      <Button type="submit" disabled={loading || (medicineInInventory && !!stockWarning)} className="w-full">
        {loading ? "Creating..." : "Create Prescription"}
      </Button>
    </form>
  );
};

export default PrescriptionForm;
