import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";

interface PrescriptionData {
  id: string;
  patient_name: string;
  patient_id: string;
  doctor_name: string;
  doctor_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration_days: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  instructions: string | null;
}

const ITEMS_PER_PAGE = 10;

const AdminPrescriptionsView = () => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      // Fetch prescriptions
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from("prescriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (prescriptionsError) throw prescriptionsError;

      // Fetch profiles for names
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) throw profilesError;

      // Fetch patients mapping
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("patient_id, user_id");

      if (patientsError) throw patientsError;

      // Fetch doctors mapping
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("doctor_id, user_id");

      if (doctorsError) throw doctorsError;

      // Combine data
      const combinedPrescriptions: PrescriptionData[] = prescriptionsData.map((rx) => {
        const patient = patientsData.find((p) => p.patient_id === rx.patient_ref);
        const doctor = doctorsData.find((d) => d.doctor_id === rx.doctor_ref);
        const patientProfile = profilesData.find((p) => p.id === patient?.user_id);
        const doctorProfile = profilesData.find((p) => p.id === doctor?.user_id);

        return {
          id: rx.id,
          patient_name: patientProfile?.full_name || "Unknown Patient",
          patient_id: rx.patient_ref || rx.patient_id,
          doctor_name: doctorProfile?.full_name || "Unknown Doctor",
          doctor_id: rx.doctor_ref || rx.doctor_id,
          medication_name: rx.medication_name,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration_days: rx.duration_days,
          start_date: rx.start_date,
          end_date: rx.end_date,
          status: rx.status,
          instructions: rx.instructions,
        };
      });

      setPrescriptions(combinedPrescriptions);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching prescriptions",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter prescriptions
  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesSearch = 
      rx.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rx.medication_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPrescriptions.length / ITEMS_PER_PAGE);
  const paginatedPrescriptions = filteredPrescriptions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading prescriptions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by patient, doctor, or medicine..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Medication</TableHead>
              <TableHead>Dosage & Frequency</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPrescriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No prescriptions found
                </TableCell>
              </TableRow>
            ) : (
              paginatedPrescriptions.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rx.patient_name}</p>
                      <p className="text-xs text-muted-foreground">ID: {rx.patient_id.slice(0, 8)}...</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rx.doctor_name}</p>
                      <p className="text-xs text-muted-foreground">ID: {rx.doctor_id.slice(0, 8)}...</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{rx.medication_name}</TableCell>
                  <TableCell>
                    <div>
                      <p>{rx.dosage}</p>
                      <p className="text-xs text-muted-foreground">{rx.frequency}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {rx.duration_days ? `${rx.duration_days} days` : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(rx.start_date), "MMM d, yyyy")}</span>
                    </div>
                    {rx.end_date && (
                      <div className="text-xs text-muted-foreground">
                        to {format(new Date(rx.end_date), "MMM d, yyyy")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(rx.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPrescriptions.length)} of {filteredPrescriptions.length} prescriptions
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        * This is a read-only view. Admins cannot modify prescription data.
      </p>
    </div>
  );
};

export default AdminPrescriptionsView;
