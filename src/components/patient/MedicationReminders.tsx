import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, Pill, Edit2, Save, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MedicationRemindersProps {
  user: User;
}

interface ActivePrescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
}

interface MedicationReminder {
  reminder_id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  reminder_times: string[];
  start_date: string;
  end_date: string | null;
  notification_type: string;
  is_enabled: boolean;
}

// Frequency to time mapping - aligned with doctor frequency options
const FREQUENCY_TIME_MAP: Record<string, { times: string[], label: string }> = {
  "once_morning": { times: ["08:00"], label: "Once a day (Morning)" },
  "once_afternoon": { times: ["13:00"], label: "Once a day (Afternoon)" },
  "once_night": { times: ["20:00"], label: "Once a day (Night)" },
  "twice_daily": { times: ["08:00", "20:00"], label: "Twice a day (Morning, Night)" },
  "three_times_daily": { times: ["08:00", "13:00", "20:00"], label: "Three times a day" },
  "every_8_hours": { times: ["06:00", "14:00", "22:00"], label: "Every 8 hours" },
  // Legacy mappings for backward compatibility
  "1-0-0": { times: ["08:00"], label: "Once daily (Morning)" },
  "0-1-0": { times: ["13:00"], label: "Once daily (Afternoon)" },
  "0-0-1": { times: ["20:00"], label: "Once daily (Night)" },
  "1-0-1": { times: ["08:00", "20:00"], label: "Twice daily" },
  "1-1-1": { times: ["08:00", "13:00", "20:00"], label: "Three times daily" },
  "Every 8 hours": { times: ["06:00", "14:00", "22:00"], label: "Every 8 hours" },
  "every 8 hours": { times: ["06:00", "14:00", "22:00"], label: "Every 8 hours" },
  "Once daily": { times: ["08:00"], label: "Once daily" },
  "once daily": { times: ["08:00"], label: "Once daily" },
  "Twice daily": { times: ["08:00", "20:00"], label: "Twice daily" },
  "twice daily": { times: ["08:00", "20:00"], label: "Twice daily" },
  "Three times daily": { times: ["08:00", "13:00", "20:00"], label: "Three times daily" },
  "three times daily": { times: ["08:00", "13:00", "20:00"], label: "Three times daily" },
};

const formatTime = (time24: string): string => {
  const [hours, minutes] = time24.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getDefaultTimes = (frequency: string): string[] => {
  const mapping = FREQUENCY_TIME_MAP[frequency] || FREQUENCY_TIME_MAP[frequency.toLowerCase()];
  return mapping?.times || ["08:00"];
};

const getFrequencyLabel = (frequency: string): string => {
  const mapping = FREQUENCY_TIME_MAP[frequency] || FREQUENCY_TIME_MAP[frequency.toLowerCase()];
  return mapping?.label || frequency;
};

const MedicationReminders = ({ user }: MedicationRemindersProps) => {
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<ActivePrescription[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [editTimes, setEditTimes] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch patient data and prescriptions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get patient_id
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("patient_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (patientError || !patientData) {
          console.error("Error fetching patient:", patientError);
          setLoading(false);
          return;
        }

        setPatientId(patientData.patient_id);

        // Fetch active prescriptions
        const { data: prescriptionData, error: prescriptionError } = await supabase
          .from("prescriptions")
          .select("id, medication_name, dosage, frequency, start_date, end_date, instructions")
          .eq("patient_ref", patientData.patient_id)
          .eq("status", "active");

        if (prescriptionError) {
          console.error("Error fetching prescriptions:", prescriptionError);
        } else {
          setPrescriptions(prescriptionData || []);
        }

        // Fetch existing reminders
        const { data: reminderData, error: reminderError } = await supabase
          .from("medication_reminders")
          .select("*")
          .eq("patient_id", patientData.patient_id);

        if (reminderError) {
          console.error("Error fetching reminders:", reminderError);
        } else {
          setReminders(reminderData || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  // Real-time subscription for reminders
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel("medication-reminders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medication_reminders",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReminders((prev) => [...prev, payload.new as MedicationReminder]);
          } else if (payload.eventType === "UPDATE") {
            setReminders((prev) =>
              prev.map((r) =>
                r.reminder_id === (payload.new as MedicationReminder).reminder_id
                  ? (payload.new as MedicationReminder)
                  : r
              )
            );
          } else if (payload.eventType === "DELETE") {
            setReminders((prev) =>
              prev.filter((r) => r.reminder_id !== (payload.old as MedicationReminder).reminder_id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  const toggleReminder = async (prescription: ActivePrescription, currentReminder?: MedicationReminder) => {
    if (!patientId) return;

    setSavingId(prescription.id);

    try {
      if (currentReminder) {
        // Toggle existing reminder
        const { error } = await supabase
          .from("medication_reminders")
          .update({ is_enabled: !currentReminder.is_enabled })
          .eq("reminder_id", currentReminder.reminder_id);

        if (error) throw error;

        toast({
          title: currentReminder.is_enabled ? "Reminder disabled" : "Reminder enabled",
          description: `Reminder for ${prescription.medication_name} has been ${currentReminder.is_enabled ? "disabled" : "enabled"}.`,
        });
      } else {
        // Create new reminder
        const defaultTimes = getDefaultTimes(prescription.frequency);
        const { error } = await supabase.from("medication_reminders").insert({
          patient_id: patientId,
          prescription_id: prescription.id,
          medicine_name: prescription.medication_name,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          reminder_times: defaultTimes,
          start_date: prescription.start_date,
          end_date: prescription.end_date,
          notification_type: "both",
          is_enabled: true,
        });

        if (error) throw error;

        toast({
          title: "Reminder created",
          description: `Reminder for ${prescription.medication_name} has been created.`,
        });
      }
    } catch (error: any) {
      console.error("Error toggling reminder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update reminder",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const startEditTimes = (reminder: MedicationReminder) => {
    setEditingReminder(reminder.reminder_id);
    setEditTimes([...reminder.reminder_times]);
  };

  const cancelEdit = () => {
    setEditingReminder(null);
    setEditTimes([]);
  };

  const saveEditTimes = async (reminder: MedicationReminder) => {
    setSavingId(reminder.reminder_id);
    try {
      const { error } = await supabase
        .from("medication_reminders")
        .update({ reminder_times: editTimes })
        .eq("reminder_id", reminder.reminder_id);

      if (error) throw error;

      toast({
        title: "Times updated",
        description: "Reminder times have been updated successfully.",
      });
      setEditingReminder(null);
      setEditTimes([]);
    } catch (error: any) {
      console.error("Error updating times:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update reminder times",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const updateNotificationType = async (reminder: MedicationReminder, type: string) => {
    setSavingId(reminder.reminder_id);
    try {
      const { error } = await supabase
        .from("medication_reminders")
        .update({ notification_type: type })
        .eq("reminder_id", reminder.reminder_id);

      if (error) throw error;

      toast({
        title: "Notification type updated",
        description: `Notifications set to ${type === "both" ? "in-app & email" : type}.`,
      });
    } catch (error: any) {
      console.error("Error updating notification type:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update notification type",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const getReminderForPrescription = (prescriptionId: string) => {
    return reminders.find((r) => r.prescription_id === prescriptionId);
  };

  // Sort prescriptions to show those with enabled reminders first
  const sortedPrescriptions = [...prescriptions].sort((a, b) => {
    const reminderA = getReminderForPrescription(a.id);
    const reminderB = getReminderForPrescription(b.id);
    if (reminderA?.is_enabled && !reminderB?.is_enabled) return -1;
    if (!reminderA?.is_enabled && reminderB?.is_enabled) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Active Prescriptions</h3>
        <p className="text-muted-foreground">
          You don't have any active prescriptions to set reminders for.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Medication Reminders</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable reminders for your active prescriptions to never miss a dose.
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">
          {reminders.filter((r) => r.is_enabled).length} Active
        </Badge>
      </div>

      <div className="grid gap-4">
        {sortedPrescriptions.map((prescription) => {
          const reminder = getReminderForPrescription(prescription.id);
          const isEditing = editingReminder === reminder?.reminder_id;
          const isSaving = savingId === prescription.id || savingId === reminder?.reminder_id;
          const displayTimes = isEditing ? editTimes : (reminder?.reminder_times || getDefaultTimes(prescription.frequency));

          return (
            <Card key={prescription.id} className={`transition-all ${reminder?.is_enabled ? "border-primary/50 bg-primary/5" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reminder?.is_enabled ? "bg-primary/20" : "bg-muted"}`}>
                      <Pill className={`w-5 h-5 ${reminder?.is_enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{prescription.medication_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Switch
                      checked={reminder?.is_enabled ?? false}
                      onCheckedChange={() => toggleReminder(prescription, reminder)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="font-medium">{getFrequencyLabel(prescription.frequency)}</span>
                  </div>
                  {prescription.end_date && (
                    <div className="text-muted-foreground">
                      Until: {new Date(prescription.end_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Reminder Times */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Reminder Times</Label>
                    {reminder?.is_enabled && !isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditTimes(reminder)}
                        className="h-8 text-xs"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {isEditing && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                          className="h-8 text-xs"
                          disabled={isSaving}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => saveEditTimes(reminder!)}
                          className="h-8 text-xs"
                          disabled={isSaving}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {displayTimes.map((time, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {isEditing ? (
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...editTimes];
                              newTimes[index] = e.target.value;
                              setEditTimes(newTimes);
                            }}
                            className="w-32 h-8 text-sm"
                          />
                        ) : (
                          <Badge variant="secondary" className="px-3 py-1">
                            <Bell className="w-3 h-3 mr-1" />
                            {formatTime(time)}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notification Type */}
                {reminder?.is_enabled && (
                  <div className="flex items-center gap-4">
                    <Label className="text-sm">Notify via:</Label>
                    <Select
                      value={reminder.notification_type}
                      onValueChange={(value) => updateNotificationType(reminder, value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_app">In-App Only</SelectItem>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="both">In-App & Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {prescription.instructions && (
                  <p className="text-sm text-muted-foreground italic">
                    Instructions: {prescription.instructions}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MedicationReminders;