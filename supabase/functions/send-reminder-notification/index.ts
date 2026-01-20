import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderNotificationRequest {
  reminder_id?: string;
  patient_email?: string;
  medicine_name?: string;
  dosage?: string;
  notification_type?: string;
  check_scheduled?: boolean;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ReminderNotificationRequest = await req.json();
    console.log("Received notification request:", body);

    // For scheduled cron jobs, verify the cron secret
    if (body.check_scheduled) {
      const providedSecret = req.headers.get("X-Cron-Secret");
      if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
        console.error("Unauthorized cron request - invalid or missing secret");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      // Use service role for scheduled tasks (authorized via secret)
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      return await checkAndSendScheduledReminders(supabase);
    }

    // For manual invocations, require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's auth token to validate
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated user:", user.id);

    // Use service role for actual operations (after auth validation)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { patient_email, medicine_name, dosage, notification_type } = body;

    if (!patient_email || !medicine_name || !dosage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (notification_type === "email" || notification_type === "both") {
      const emailResult = await sendEmailNotification(patient_email, medicine_name, dosage);
      console.log("Email notification result:", emailResult);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-reminder-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

async function sendEmailNotification(email: string, medicineName: string, dosage: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MedReminder <onboarding@resend.dev>",
        to: [email],
        subject: `Medication Reminder: ${medicineName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #0d9488, #14b8a6); padding: 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .pill-icon { font-size: 48px; margin-bottom: 15px; }
                .medicine-name { font-size: 22px; font-weight: bold; color: #0d9488; margin-bottom: 8px; }
                .dosage { font-size: 16px; color: #666; margin-bottom: 20px; }
                .message { background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>💊 Medication Reminder</h1>
                </div>
                <div class="content">
                  <div style="text-align: center;">
                    <div class="pill-icon">⏰</div>
                    <div class="medicine-name">${medicineName}</div>
                    <div class="dosage">${dosage}</div>
                  </div>
                  <div class="message">
                    <strong>Time to take your medication!</strong><br><br>
                    Time to take <strong>${medicineName}</strong> (${dosage}) as prescribed by your doctor.
                  </div>
                  <p style="color: #666; text-align: center;">Stay healthy and consistent with your medication schedule.</p>
                </div>
                <div class="footer">
                  This is an automated reminder from your healthcare app.
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error: any) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

async function checkAndSendScheduledReminders(supabase: any) {
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, "0");
  const currentMinute = now.getMinutes().toString().padStart(2, "0");
  const currentTime = `${currentHour}:${currentMinute}`;
  const today = now.toISOString().split("T")[0];

  console.log(`Checking reminders for time: ${currentTime}, date: ${today}`);

  const { data: reminders, error: remindersError } = await supabase
    .from("medication_reminders")
    .select(`
      *,
      patients!inner(user_id)
    `)
    .eq("is_enabled", true)
    .lte("start_date", today)
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (remindersError) {
    console.error("Error fetching reminders:", remindersError);
    return new Response(
      JSON.stringify({ error: remindersError.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log(`Found ${reminders?.length || 0} active reminders`);

  const notifications: any[] = [];

  for (const reminder of reminders || []) {
    const shouldNotify = reminder.reminder_times.some((time: string) => {
      return time === currentTime;
    });

    if (shouldNotify) {
      const { data: userData } = await supabase.auth.admin.getUserById(reminder.patients.user_id);
      const patientEmail = userData?.user?.email;

      if (patientEmail && (reminder.notification_type === "email" || reminder.notification_type === "both")) {
        const emailResult = await sendEmailNotification(
          patientEmail,
          reminder.medicine_name,
          reminder.dosage
        );
        notifications.push({
          reminder_id: reminder.reminder_id,
          email: patientEmail,
          result: emailResult,
        });
      }
    }
  }

  // Disable reminders for completed/cancelled prescriptions
  const { data: expiredReminders } = await supabase
    .from("medication_reminders")
    .select(`
      reminder_id,
      prescription_id,
      prescriptions!inner(status, end_date)
    `)
    .eq("is_enabled", true);

  for (const reminder of expiredReminders || []) {
    const prescription = reminder.prescriptions;
    const shouldDisable =
      prescription.status !== "active" ||
      (prescription.end_date && new Date(prescription.end_date) < now);

    if (shouldDisable) {
      await supabase
        .from("medication_reminders")
        .update({ is_enabled: false })
        .eq("reminder_id", reminder.reminder_id);

      console.log(`Disabled reminder ${reminder.reminder_id} due to prescription status/expiry`);
    }
  }

  return new Response(
    JSON.stringify({ success: true, notifications_sent: notifications.length, notifications }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}