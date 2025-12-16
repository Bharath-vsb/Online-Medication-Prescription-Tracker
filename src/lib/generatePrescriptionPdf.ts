import { jsPDF } from "jspdf";

interface PrescriptionPdfData {
  patientName: string;
  patientId: string;
  doctorName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
  status: string;
}

export const generatePrescriptionPdf = (prescription: PrescriptionPdfData) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(20, 60, 60);
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("PRESCRIPTION", 105, 25, { align: "center" });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Patient Info Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", 20, 55);
  doc.setDrawColor(20, 60, 60);
  doc.line(20, 58, 190, 58);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Name: ${prescription.patientName}`, 20, 68);
  doc.text(`Patient ID: ${prescription.patientId}`, 20, 76);
  
  // Doctor Info Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Prescribing Doctor", 20, 92);
  doc.line(20, 95, 190, 95);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Dr. ${prescription.doctorName}`, 20, 105);
  
  // Prescription Details Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Prescription Details", 20, 121);
  doc.line(20, 124, 190, 124);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  const details = [
    { label: "Medication:", value: prescription.medicationName },
    { label: "Dosage:", value: prescription.dosage },
    { label: "Frequency:", value: prescription.frequency },
    { label: "Start Date:", value: prescription.startDate },
    { label: "End Date:", value: prescription.endDate || "Ongoing" },
    { label: "Status:", value: prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1) },
  ];
  
  let yPos = 134;
  details.forEach((detail) => {
    doc.setFont("helvetica", "bold");
    doc.text(detail.label, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, 70, yPos);
    yPos += 10;
  });
  
  // Instructions Section
  if (prescription.instructions) {
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Special Instructions", 20, yPos);
    doc.line(20, yPos + 3, 190, yPos + 3);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const instructionLines = doc.splitTextToSize(prescription.instructions, 170);
    doc.text(instructionLines, 20, yPos + 13);
  }
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 280);
  doc.text("This is a computer-generated prescription.", 105, 280, { align: "center" });
  
  // Download
  doc.save(`prescription-${prescription.patientId}-${prescription.medicationName}.pdf`);
};
