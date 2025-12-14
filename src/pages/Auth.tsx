import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  role: z.enum(["doctor", "patient", "pharmacist", "admin"]),
  medicalLicenseNumber: z.string().trim().max(50).optional(),
  specialization: z.string().trim().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["doctor", "patient", "pharmacist", "admin"]),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"doctor" | "patient" | "pharmacist" | "admin">("patient");
  const [medicalLicenseNumber, setMedicalLicenseNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is logged in, but we need them to select a role
        // So we don't auto-redirect from auth page
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = {
        fullName,
        email,
        password,
        role,
        medicalLicenseNumber: role === "doctor" ? medicalLicenseNumber : undefined,
        specialization: role === "doctor" ? specialization : undefined,
      };

      const validated = signupSchema.parse(formData);

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validated.fullName,
            medical_license_number: validated.medicalLicenseNumber || null,
            specialization: validated.specialization || null,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Insert role into user_roles table
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: validated.role });

        if (roleError) throw roleError;

        toast({
          title: "Account created successfully!",
          description: "You can now sign in.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else if (error.message?.includes("already registered")) {
        toast({
          variant: "destructive",
          title: "Email already exists",
          description: "This email is already registered. Please sign in instead.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to create account",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = loginSchema.parse({ email, password, role });

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      if (!authData.user) {
        throw new Error("Authentication failed");
      }

      // Verify user has the selected role in the database
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (roleError) {
        await supabase.auth.signOut();
        throw new Error("Failed to verify user role");
      }

      if (!userRole) {
        await supabase.auth.signOut();
        throw new Error("No role assigned to this account. Please contact support.");
      }

      // Check if selected role matches the user's actual role
      if (userRole.role !== validated.role) {
        await supabase.auth.signOut();
        toast({
          variant: "destructive",
          title: "Role Mismatch",
          description: `This account is registered as a ${userRole.role}. Please select the correct role.`,
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });

      // Navigate to the appropriate dashboard based on verified role
      const dashboardPaths: Record<string, string> = {
        doctor: "/doctor",
        patient: "/patient",
        pharmacist: "/pharmacist",
        admin: "/admin",
      };
      navigate(dashboardPaths[userRole.role]);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else if (error.message?.includes("Invalid login credentials")) {
        toast({
          variant: "destructive",
          title: "Invalid credentials",
          description: "Please check your email and password.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to sign in",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg p-8 shadow-2xl border border-border">
          <h1 className="text-3xl font-bold text-center mb-6 text-foreground">
            {isLogin ? "Sign In" : "Sign Up"}
          </h1>

          <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-input border-border text-foreground"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input border-border text-foreground"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-input border-border text-foreground"
                placeholder="Enter your password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">
                Role
              </Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isLogin && role === "doctor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="medicalLicense" className="text-foreground">
                    Medical License Number
                  </Label>
                  <Input
                    id="medicalLicense"
                    type="text"
                    value={medicalLicenseNumber}
                    onChange={(e) => setMedicalLicenseNumber(e.target.value)}
                    className="bg-input border-border text-foreground"
                    placeholder="Enter your medical license"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialization" className="text-foreground">
                    Specialization
                  </Label>
                  <Input
                    id="specialization"
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="bg-input border-border text-foreground"
                    placeholder="e.g., Cardiology, Pediatrics"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
