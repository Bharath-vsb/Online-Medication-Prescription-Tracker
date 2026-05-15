
// PDF Prescription Download Function
window.downloadPrescriptionPDF = function (prescription) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('MEDICAL PRESCRIPTION', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Online Medication & Prescription Tracking', 105, 30, { align: 'center' });

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Prescription Date
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);

    // Doctor Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Doctor Information', 20, 65);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: Dr. ${prescription.doctor?.fullName || prescription.doctor?.full_name || 'Unknown'}`, 20, 75);
    doc.text(`Email: ${prescription.doctor?.email || 'N/A'}`, 20, 82);

    // Patient Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Patient Information', 20, 100);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${currentUser.fullName}`, 20, 110);
    doc.text(`Email: ${currentUser.email}`, 20, 117);

    // Prescription Details Box
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(15, 130, 180, 80);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('PRESCRIPTION DETAILS', 105, 140, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    const details = [
        `Medicine Name: ${prescription.medicineName || prescription.medicine_name}`,
        `Dosage: ${prescription.totalQuantity || prescription.total_quantity} tablets/doses`,
        `Frequency: ${(prescription.frequency || '').replace(/-/g, ' ').toUpperCase()}`,
        `Duration: ${prescription.duration} days`,
        `Start Date: ${new Date(prescription.startDate || prescription.start_date).toLocaleDateString()}`,
        `End Date: ${new Date(prescription.endDate || prescription.end_date).toLocaleDateString()}`,
        `Status: ${prescription.bought ? 'Purchased' : 'Not Yet Purchased'}`
    ];

    let yPos = 155;
    details.forEach(detail => {
        doc.text(detail, 20, yPos);
        yPos += 8;
    });

    // Instructions
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Please follow the prescribed dosage and frequency as directed.', 20, 225);
    doc.text('Consult your doctor if you experience any adverse effects.', 20, 232);

    // Footer
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 270, 210, 27, 'F');

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a computer-generated prescription.', 105, 280, { align: 'center' });
    doc.text('For any queries, please contact your healthcare provider.', 105, 286, { align: 'center' });

    // Save PDF
    const fileName = `Prescription_${prescription.medicineName || prescription.medicine_name}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
