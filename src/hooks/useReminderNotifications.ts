import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MedicationReminder {
  reminder_id: string;
  medicine_name: string;
  dosage: string;
  reminder_times: string[];
  is_enabled: boolean;
  notification_type: string;
}

export const useReminderNotifications = (patientId: string | null) => {
  const notifiedRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAndNotify = useCallback(async () => {
    if (!patientId) return;

    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;

    // Fetch enabled reminders
    const { data: reminders } = await supabase
      .from("medication_reminders")
      .select("*")
      .eq("patient_id", patientId)
      .eq("is_enabled", true);

    if (!reminders) return;

    for (const reminder of reminders as MedicationReminder[]) {
      // Check if notification type includes in_app
      if (reminder.notification_type !== "in_app" && reminder.notification_type !== "both") {
        continue;
      }

      // Check each reminder time
      for (const time of reminder.reminder_times) {
        if (time === currentTime) {
          const notificationKey = `${reminder.reminder_id}-${currentTime}-${now.toDateString()}`;
          
          // Only notify once per reminder per time per day
          if (!notifiedRef.current.has(notificationKey)) {
            notifiedRef.current.add(notificationKey);
            
            // Show toast notification
            toast({
              title: `💊 Time for ${reminder.medicine_name}`,
              description: `Time to take ${reminder.medicine_name} (${reminder.dosage}) as prescribed by your doctor.`,
              duration: 10000,
            });

            // Request browser notification permission and show notification
            if ("Notification" in window) {
              if (Notification.permission === "granted") {
                new Notification(`Medication Reminder: ${reminder.medicine_name}`, {
                  body: `Time to take ${reminder.medicine_name} (${reminder.dosage}) as prescribed by your doctor.`,
                  icon: "/favicon.ico",
                  tag: notificationKey,
                });
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then((permission) => {
                  if (permission === "granted") {
                    new Notification(`Medication Reminder: ${reminder.medicine_name}`, {
                      body: `Time to take ${reminder.medicine_name} (${reminder.dosage}) as prescribed by your doctor.`,
                      icon: "/favicon.ico",
                      tag: notificationKey,
                    });
                  }
                });
              }
            }
          }
        }
      }
    }

    // Clean up old notification keys (older than 24 hours worth)
    if (notifiedRef.current.size > 100) {
      notifiedRef.current.clear();
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;

    // Check immediately
    checkAndNotify();

    // Check every minute
    intervalRef.current = setInterval(checkAndNotify, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [patientId, checkAndNotify]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);
};