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
import { Info, Plus, X, Pill } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

interface MedicineEntry {
  id: string;
  medicineName: string;
  inInventory: boolean;
  dosage: string;
  frequency: string;
  durationDays: number;
  endDate: string;
  instructions: string;
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
  const [startDate, setStartDate] = useState(today);
  const [dateError, setDateError] = useState("");
  
  // Multiple medicines state
  const [medicines, setMedicines] = useState<MedicineEntry[]>([]);
  
  // Current medicine being added
  const [currentMedicine, setCurrentMedicine] = useState("");
  const [currentInInventory, setCurrentInInventory] = useState(false);
  const [currentDosage, setCurrentDosage] = useState("");
  const [currentFrequency, setCurrentFrequency] = useState("");
  const [currentDurationDays, setCurrentDurationDays] = useState<number | "">("");
  const [currentEndDate, setCurrentEndDate] = useState("");
  const [currentInstructions, setCurrentInstructions] = useState("");

  // Auto-calculate end date for current medicine
  useEffect(() => {
    if (startDate && currentDurationDays && typeof currentDurationDays === "number" && currentDurationDays > 0) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + currentDurationDays - 1);
      setCurrentEndDate(end.toISOString().split("T")[0]);
    } else {
      setCurrentEndDate("");
    }
  }, [startDate, currentDurationDays]);

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

  const handleMedicineChange = (name: string, inInventory: boolean, _stockQty: number) => {
    setCurrentMedicine(name);
    setCurrentInInventory(inInventory);
  };

  const calculateEndDate = (duration: number): string => {
    if (!startDate || !duration || duration <= 0) return "";
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + duration - 1);
    return end.toISOString().split("T")[0];
  };

  const addMedicine = () => {
    if (!currentMedicine) {
      toast.error("Please select a medicine");
      return;
    }
    if (!currentDosage.trim()) {
      toast.error("Please enter dosage");
      return;
    }
    if (!currentFrequency) {
      toast.error("Please select frequency");
      return;
    }
    if (!currentDurationDays || typeof currentDurationDays !== "number" || currentDurationDays <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }
    if (!currentInstructions.trim()) {
      toast.error("Please enter instructions");
      return;
    }

    // Check if medicine already added
    if (medicines.some(m => m.medicineName.toLowerCase() === currentMedicine.toLowerCase())) {
      toast.error("This medicine is already added to the prescription");
      return;
    }

    const newMedicine: MedicineEntry = {
      id: crypto.randomUUID(),
      medicineName: currentMedicine,
      inInventory: currentInInventory,
      dosage: currentDosage.trim(),
      frequency: currentFrequency,
      durationDays: currentDurationDays,
      endDate: calculateEndDate(currentDurationDays),
      instructions: currentInstructions.trim(),
    };

    setMedicines([...medicines, newMedicine]);
    
    // Reset current medicine fields
    setCurrentMedicine("");
    setCurrentInInventory(false);
    setCurrentDosage("");
    setCurrentFrequency("");
    setCurrentDurationDays("");
    setCurrentEndDate("");
    setCurrentInstructions("");
    
    toast.success(`${newMedicine.medicineName} added to prescription`);
  };

  const removeMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const getFrequencyLabel = (value: string): string => {
    return FREQUENCY_OPTIONS.find(f => f.value === value)?.label || value;
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

    if (medicines.length === 0) {
      toast.error("Please add at least one medicine to the prescription");
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

    const patient = patients.find((p) => p.patient_id === selectedPatient);

    setLoading(true);

    // Create all prescriptions
    const prescriptions = medicines.map(med => ({
      patient_id: patient?.user_id || "",
      doctor_id: user.id,
      patient_ref: selectedPatient,
      doctor_ref: doctorId,
      medication_name: med.medicineName,
      dosage: med.dosage,
      frequency: med.frequency,
      start_date: startDate,
      end_date: med.endDate,
      duration_days: med.durationDays,
      instructions: med.instructions,
    }));

    const { error } = await supabase.from("prescriptions").insert(prescriptions);

    setLoading(false);

    if (error) {
      console.error("Prescription error:", error);
      if (error.message.includes("Insufficient stock")) {
        toast.error("Insufficient stock or medicine not available. Please check medicines and try again.");
      } else {
        toast.error("Failed to create prescription");
      }
    } else {
      toast.success(`Prescription created with ${medicines.length} medicine(s)`);
      setSelectedPatient("");
      setMedicines([]);
      setStartDate(new Date().toISOString().split("T")[0]);
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient and Start Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div>
          <Label htmlFor="startDate">Prescription Start Date <span className="text-destructive">*</span></Label>
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
      </div>

      {/* Added Medicines List */}
      {medicines.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">Medicines Added ({medicines.length})</Label>
          <div className="space-y-2">
            {medicines.map((med) => (
              <Card key={med.id} className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Pill className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{med.medicineName}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{med.dosage}</span>
                          {!med.inInventory && (
                            <span className="text-xs bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full">
                              Not in inventory
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {getFrequencyLabel(med.frequency)} • {med.durationDays} days (until {med.endDate})
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5 truncate">
                          Instructions: {med.instructions}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeMedicine(med.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Medicine Section */}
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-4">
          <Label className="text-base font-semibold">Add Medicine</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medicine">Select Medicine <span className="text-destructive">*</span></Label>
              <MedicineSelect
                value={currentMedicine}
                onValueChange={handleMedicineChange}
                userId={user.id}
                userName={doctorName}
              />
            </div>
            <div>
              <Label htmlFor="dosage">Dosage <span className="text-destructive">*</span></Label>
              <Input
                id="dosage"
                value={currentDosage}
                onChange={(e) => setCurrentDosage(e.target.value)}
                placeholder="e.g., 500mg"
              />
            </div>
          </div>

          {currentMedicine && !currentInInventory && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-700">
                This medicine is not currently in inventory. Pharmacist has been notified to add it.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency <span className="text-destructive">*</span></Label>
              <Select value={currentFrequency} onValueChange={setCurrentFrequency}>
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
              <Label htmlFor="durationDays">Duration (Days) <span className="text-destructive">*</span></Label>
              <Input
                id="durationDays"
                type="number"
                min={1}
                value={currentDurationDays}
                onChange={(e) => setCurrentDurationDays(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="e.g., 7"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date (Auto)</Label>
              <Input
                id="endDate"
                type="date"
                value={currentEndDate}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Instructions <span className="text-destructive">*</span></Label>
            <Textarea
              id="instructions"
              value={currentInstructions}
              onChange={(e) => setCurrentInstructions(e.target.value)}
              placeholder="Special instructions for this medicine"
              rows={2}
            />
          </div>

          <Button type="button" variant="outline" onClick={addMedicine} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Medicine to Prescription
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading || medicines.length === 0} className="w-full">
        {loading ? "Creating..." : `Create Prescription (${medicines.length} medicine${medicines.length !== 1 ? 's' : ''})`}
      </Button>
    </form>
  );
};

export default PrescriptionForm;
