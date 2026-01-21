import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, User, Pill, ShoppingCart, AlertTriangle, CheckCircle, History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";

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
  duration_days: number | null;
  status: "active" | "completed" | "cancelled";
  instructions: string | null;
  is_sold: boolean;
  doctor_name?: string;
  patient_name?: string;
  patient_code?: string;
  updated_at?: string;
}

interface InventoryItem {
  id: string;
  medicine_name: string;
  stock_quantity: number;
}

const FREQUENCY_DOSES: Record<string, number> = {
  once_morning: 1,
  once_afternoon: 1,
  once_night: 1,
  twice_daily: 2,
  three_times_daily: 3,
  every_8_hours: 3,
};

const FREQUENCY_LABELS: Record<string, string> = {
  once_morning: "Once a day (Morning)",
  once_afternoon: "Once a day (Afternoon)",
  once_night: "Once a day (Night)",
  twice_daily: "Twice a day",
  three_times_daily: "Three times a day",
  every_8_hours: "Every 8 hours",
};

const PatientPrescriptionViewer = () => {
  const [activeTab, setActiveTab] = useState("sell");
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [sellingHistory, setSellingHistory] = useState<Prescription[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sellingId, setSellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
    fetchInventory();
    fetchSellingHistory();

    // Subscribe to inventory changes
    const channel = supabase
      .channel("inventory-prescription-viewer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        fetchInventory
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions" },
        () => {
          fetchSellingHistory();
          if (selectedPatient) {
            fetchPrescriptions(selectedPatient);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const fetchInventory = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("id, medicine_name, stock_quantity");
    if (data) {
      setInventory(data);
    }
  };

  const fetchSellingHistory = async () => {
    // Fetch all sold prescriptions
    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        medication_name,
        dosage,
        frequency,
        start_date,
        end_date,
        duration_days,
        status,
        instructions,
        is_sold,
        updated_at,
        doctor_id,
        patient_ref
      `)
      .eq("is_sold", true)
      .order("updated_at", { ascending: false });

    if (error || !data) {
      return;
    }

    // Fetch doctor names
    const doctorIds = [...new Set(data.map((p) => p.doctor_id))];
    const { data: doctorProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", doctorIds);
    const doctorMap = new Map(doctorProfiles?.map((p) => [p.id, p.full_name]) || []);

    // Fetch patient names
    const patientRefs = [...new Set(data.map((p) => p.patient_ref).filter(Boolean))];
    const { data: patientsData } = await supabase
      .from("patients")
      .select("patient_id, user_id")
      .in("patient_id", patientRefs);

    let patientMap = new Map<string, { name: string; code: string }>();
    if (patientsData) {
      const userIds = patientsData.map((p) => p.user_id);
      const { data: patientProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, patient_id")
        .in("id", userIds);

      const profileMap = new Map(
        patientProfiles?.map((p) => [p.id, { name: p.full_name, code: p.patient_id || "" }]) || []
      );
      
      patientMap = new Map(
        patientsData.map((p) => [
          p.patient_id,
          profileMap.get(p.user_id) || { name: "Unknown", code: "" }
        ])
      );
    }

    const historyWithNames = data.map((p) => ({
      ...p,
      is_sold: p.is_sold ?? false,
      doctor_name: doctorMap.get(p.doctor_id) || "Unknown Doctor",
      patient_name: patientMap.get(p.patient_ref || "")?.name || "Unknown Patient",
      patient_code: patientMap.get(p.patient_ref || "")?.code || "",
    }));

    setSellingHistory(historyWithNames);
  };

  const fetchPrescriptions = async (patient: Patient) => {
    setLoading(true);
    setSelectedPatient(patient);

    // First call the auto-complete function to update expired prescriptions
    await supabase.rpc("auto_complete_expired_prescriptions");

    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        id,
        medication_name,
        dosage,
        frequency,
        start_date,
        end_date,
        duration_days,
        status,
        instructions,
        is_sold,
        doctor_id
      `)
      .eq("patient_ref", patient.patient_id)
      .eq("status", "active")
      .eq("is_sold", false) // Only unsold prescriptions
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
        is_sold: p.is_sold ?? false,
        doctor_name: doctorMap.get(p.doctor_id) || "Unknown Doctor",
      }));

      setPrescriptions(prescriptionsWithDoctors);
    }

    // Refresh inventory
    await fetchInventory();
    setLoading(false);
    setSearchTerm("");
    setFilteredPatients([]);
  };

  const calculateTotalQuantity = (prescription: Prescription): number => {
    const dosesPerDay = FREQUENCY_DOSES[prescription.frequency] || 1;

    // Use duration_days if available
    if (prescription.duration_days) {
      return prescription.duration_days * dosesPerDay;
    }

    // Fallback to calculating from dates
    if (prescription.start_date && prescription.end_date) {
      const start = new Date(prescription.start_date);
      const end = new Date(prescription.end_date);
      const days =
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      return days * dosesPerDay;
    }

    return 0;
  };

  const getDurationDays = (prescription: Prescription): number => {
    if (prescription.duration_days) {
      return prescription.duration_days;
    }

    if (prescription.start_date && prescription.end_date) {
      const start = new Date(prescription.start_date);
      const end = new Date(prescription.end_date);
      return (
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1
      );
    }

    return 0;
  };

  const getAvailableStock = (medicineName: string): number => {
    const item = inventory.find(
      (inv) => inv.medicine_name.toLowerCase() === medicineName.toLowerCase()
    );
    return item?.stock_quantity || 0;
  };

  const handleSell = async (prescription: Prescription) => {
    // Prevent selling if already sold
    if (prescription.is_sold) {
      toast.error("This prescription has already been sold");
      return;
    }

    const totalQuantity = calculateTotalQuantity(prescription);
    const availableStock = getAvailableStock(prescription.medication_name);

    if (availableStock < totalQuantity) {
      toast.error(
        `Insufficient stock. Required: ${totalQuantity}, Available: ${availableStock}`
      );
      return;
    }

    if (!selectedPatient) {
      toast.error("No patient selected");
      return;
    }

    setSellingId(prescription.id);

    try {
      // Get current user for sold_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        setSellingId(null);
        return;
      }

      // Find inventory item and deduct stock
      const { data: invItem } = await supabase
        .from("inventory")
        .select("id, stock_quantity")
        .ilike("medicine_name", prescription.medication_name)
        .gt("stock_quantity", 0)
        .order("expiry_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!invItem) {
        toast.error("Medicine not found in inventory");
        setSellingId(null);
        return;
      }

      // Deduct stock
      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          stock_quantity: invItem.stock_quantity - totalQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invItem.id);

      if (updateError) {
        toast.error("Failed to update inventory");
        setSellingId(null);
        return;
      }

      // Create prescription sale record
      const { error: saleError } = await supabase
        .from("prescription_sales")
        .insert({
          prescription_id: prescription.id,
          patient_id: selectedPatient.patient_id,
          inventory_id: invItem.id,
          sold_quantity: totalQuantity,
          sold_by: user.id,
        });

      if (saleError) {
        console.error("Sale record error:", saleError);
        toast.error("Failed to record sale");
        setSellingId(null);
        return;
      }

      // Mark prescription as sold and update sold_quantity
      const { error: prescError } = await supabase
        .from("prescriptions")
        .update({
          is_sold: true,
          sold_quantity: totalQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prescription.id);

      if (prescError) {
        toast.error("Failed to update prescription status");
        setSellingId(null);
        return;
      }

      toast.success(
        `Sold ${totalQuantity} units of ${prescription.medication_name}`
      );

      // Refresh data
      if (selectedPatient) {
        await fetchPrescriptions(selectedPatient);
      }
      await fetchSellingHistory();
    } catch (error) {
      console.error("Sell error:", error);
      toast.error("An error occurred while processing the sale");
    }

    setSellingId(null);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="sell" className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Sell Medicines
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Selling History ({sellingHistory.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sell">
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
                    <p>No active prescriptions found for this patient</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Duration (Days)</TableHead>
                        <TableHead>Prescribed By</TableHead>
                        <TableHead>Total Qty</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.map((prescription) => {
                        const totalQty = calculateTotalQuantity(prescription);
                        const duration = getDurationDays(prescription);
                        const availableStock = getAvailableStock(
                          prescription.medication_name
                        );
                        const insufficientStock = availableStock < totalQty;
                        const isSold = prescription.is_sold;

                        return (
                          <TableRow key={prescription.id}>
                            <TableCell className="font-medium">
                              {prescription.medication_name}
                            </TableCell>
                            <TableCell>
                              {FREQUENCY_LABELS[prescription.frequency] ||
                                prescription.frequency}
                            </TableCell>
                            <TableCell>{duration} days</TableCell>
                            <TableCell className="text-muted-foreground">
                              {prescription.doctor_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{totalQty} units</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={insufficientStock ? "destructive" : "outline"}
                                className={
                                  insufficientStock
                                    ? ""
                                    : "bg-green-500/10 text-green-600 border-green-500/30"
                                }
                              >
                                {availableStock}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isSold ? (
                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  Sold
                                </div>
                              ) : insufficientStock ? (
                                <div className="flex items-center gap-1 text-destructive text-sm">
                                  <AlertTriangle className="w-4 h-4" />
                                  Low Stock
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleSell(prescription)}
                                  disabled={sellingId === prescription.id}
                                  className="flex items-center gap-1"
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                  {sellingId === prescription.id
                                    ? "Selling..."
                                    : "Sell"}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Selling History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellingHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <History className="w-12 h-12 opacity-50" />
                <p>No selling history yet</p>
              </div>
            ) : (
              <>
                <div className="bg-muted/30 rounded-lg p-4 mb-4 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  This is a read-only record of all medicines sold. These records cannot be modified.
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Qty Sold</TableHead>
                        <TableHead>Prescribed By</TableHead>
                        <TableHead>Sold On</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellingHistory.map((item) => {
                        const totalQty = calculateTotalQuantity(item);
                        const duration = getDurationDays(item);

                        return (
                          <TableRow key={item.id} className="opacity-90">
                            <TableCell className="font-mono text-sm">
                              {item.patient_code || "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.patient_name}
                            </TableCell>
                            <TableCell>{item.medication_name}</TableCell>
                            <TableCell>
                              {FREQUENCY_LABELS[item.frequency] || item.frequency}
                            </TableCell>
                            <TableCell>{duration} days</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{totalQty} units</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.doctor_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.updated_at
                                ? format(new Date(item.updated_at), "MMM d, yyyy HH:mm")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sold
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default PatientPrescriptionViewer;
