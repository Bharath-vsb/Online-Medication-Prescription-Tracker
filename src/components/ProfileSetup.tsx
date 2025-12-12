import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

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
      }
    };

    fetchProfile();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updateData: Record<string, string> = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
    };

    if (role === "doctor") {
      updateData.medical_license_number = medicalLicenseNumber.trim();
      updateData.specialization = specialization.trim();
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
      onProfileComplete();
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Profile Setup</h2>
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
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
            />
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
                required
              />
            </div>
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="Enter specialization"
                required
              />
            </div>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
};

export default ProfileSetup;
