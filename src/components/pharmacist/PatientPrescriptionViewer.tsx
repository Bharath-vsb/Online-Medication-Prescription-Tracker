import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, User, Pill, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Patient {
  patient_id: string;
  user_id: string;
  full_name: string;
  patient_code: string | null;
}

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "cancelled";
  instructions: string | null;
  doctor_name?: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  once_morning: "Once a day (Morning)",
  once_afternoon: "Once a day (Afternoon)",
  once_night: "Once a day (Night)",
  twice_daily: "Twice a day",
  three_times_daily: "Three times a day",
  every_8_hours: "Every 8 hours",
};

const PatientPrescriptionViewer = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = patients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.patient_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients([]);
    }
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
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
        const profileMap = new Map(
          profiles.map((p) => [p.id, { name: p.full_name, code: p.patient_id }])
        );
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

  const fetchPrescriptions = async (patient: Patient) => {
    setLoading(true);
    setSelectedPatient(patient);

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        medication_name,
        dosage,
        frequency,
        start_date,
        end_date,
        status,
        instructions,
        doctor_id
      `)
      .eq("patient_ref", patient.patient_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prescriptions:", error);
      setPrescriptions([]);
    } else if (data) {
      // Fetch doctor names
      const doctorIds = [...new Set(data.map((p) => p.doctor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", doctorIds);

      const doctorMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      const prescriptionsWithDoctors = data.map((p) => ({
        ...p,
        doctor_name: doctorMap.get(p.doctor_id) || "Unknown Doctor",
      }));

      setPrescriptions(prescriptionsWithDoctors);
    }

    setLoading(false);
    setSearchTerm("");
    setFilteredPatients([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Label htmlFor="patientSearch" className="sr-only">
              Search by Patient ID or Name
            </Label>
            <Input
              id="patientSearch"
              placeholder="Search by Patient ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          </div>

          {/* Search Results Dropdown */}
          {filteredPatients.length > 0 && (
            <div className="mt-2 border border-border rounded-lg bg-card shadow-lg max-h-60 overflow-y-auto">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.patient_id}
                  onClick={() => fetchPrescriptions(patient)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-3 border-b border-border last:border-0"
                >
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{patient.full_name}</p>
                    {patient.patient_code && (
                      <p className="text-sm text-muted-foreground">
                        ID: {patient.patient_code}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchTerm && filteredPatients.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              No patients found matching "{searchTerm}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Selected Patient Info */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {selectedPatient.full_name}
              {selectedPatient.patient_code && (
                <Badge variant="outline">{selectedPatient.patient_code}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading prescriptions...
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <Pill className="w-12 h-12 opacity-50" />
                <p>No prescriptions found for this patient</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Prescribed By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((prescription) => (
                    <TableRow key={prescription.id}>
                      <TableCell className="font-medium">
                        {prescription.medication_name}
                      </TableCell>
                      <TableCell>{prescription.dosage}</TableCell>
                      <TableCell>
                        {FREQUENCY_LABELS[prescription.frequency] ||
                          prescription.frequency}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(prescription.start_date).toLocaleDateString()}
                          {prescription.end_date && (
                            <>
                              {" - "}
                              {new Date(prescription.end_date).toLocaleDateString()}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {prescription.doctor_name}
                      </TableCell>
                      <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientPrescriptionViewer;
