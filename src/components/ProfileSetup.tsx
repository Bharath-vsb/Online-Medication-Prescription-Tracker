import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

interface ProfileSetupProps {
  user: User;
  role: string;
  onProfileComplete: () => void;
}

const ProfileSetup = ({ user, role, onProfileComplete }: ProfileSetupProps) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [medicalLicenseNumber, setMedicalLicenseNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [patientId, setPatientId] = useState("");
  const [isProfileSetup, setIsProfileSetup] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setMedicalLicenseNumber(data.medical_license_number || "");
        setSpecialization(data.specialization || "");
        setPatientId(data.patient_id || "");
        
        // Check if profile is already set up (has full_name and phone)
        if (data.full_name && data.phone) {
          setIsProfileSetup(true);
        }
      }

      // For patients, also fetch the patient_id from patients table if not in profile
      if (role === "patient") {
        const { data: patientData } = await supabase
          .from("patients")
          .select("patient_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (patientData && !data?.patient_id) {
          // Update profile with patient_id
          await supabase
            .from("profiles")
            .update({ patient_id: patientData.patient_id })
            .eq("id", user.id);
          setPatientId(patientData.patient_id);
        }
      }
    };

    fetchProfile();
  }, [user.id, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let updateData: Record<string, string>;

    if (isProfileSetup) {
      // Only update address if profile is already set up
      updateData = {
        address: address.trim(),
      };
    } else {
      // Full update for initial setup
      updateData = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };

      if (role === "doctor") {
        updateData.medical_license_number = medicalLicenseNumber.trim();
        updateData.specialization = specialization.trim();
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      if (!isProfileSetup) {
        setIsProfileSetup(true);
      }
      onProfileComplete();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Profile Setup</h2>
      
      {role === "patient" && patientId && (
        <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <Label className="text-sm text-muted-foreground">Patient ID</Label>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-lg font-mono px-3 py-1">
              {patientId}
            </Badge>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={isProfileSetup}
              className={isProfileSetup ? "bg-muted cursor-not-allowed" : ""}
            />
            {isProfileSetup && (
              <p className="text-xs text-muted-foreground mt-1">This field cannot be changed</p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              required={!isProfileSetup}
              disabled={isProfileSetup}
              className={isProfileSetup ? "bg-muted cursor-not-allowed" : ""}
            />
            {isProfileSetup && (
              <p className="text-xs text-muted-foreground mt-1">This field cannot be changed</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your address"
          />
        </div>

        {role === "doctor" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license">Medical License Number</Label>
              <Input
                id="license"
                value={medicalLicenseNumber}
                onChange={(e) => setMedicalLicenseNumber(e.target.value)}
                placeholder="Enter license number"
                required={!isProfileSetup}
                disabled={isProfileSetup}
                className={isProfileSetup ? "bg-muted cursor-not-allowed" : ""}
              />
              {isProfileSetup && (
                <p className="text-xs text-muted-foreground mt-1">This field cannot be changed</p>
              )}
            </div>
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Enter specialization"
                required={!isProfileSetup}
                disabled={isProfileSetup}
                className={isProfileSetup ? "bg-muted cursor-not-allowed" : ""}
              />
              {isProfileSetup && (
                <p className="text-xs text-muted-foreground mt-1">This field cannot be changed</p>
              )}
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : isProfileSetup ? "Update Address" : "Save Profile"}
        </Button>
      </form>
    </div>
  );
};

export default ProfileSetup;
