# Sample Medicines and Inventory Added

## Summary

Added **15 common medicines** to the medicine dropdown list and **10 inventory items** with realistic stock levels to the pharmacist inventory.

## Medicines Added (Available in Doctor's Dropdown)

The following medicines are now available when doctors create prescriptions:

1. **Paracetamol 500mg** - Pain relief and fever reducer
2. **Ibuprofen 400mg** - Anti-inflammatory and pain relief
3. **Amoxicillin 500mg** - Antibiotic
4. **Azithromycin 250mg** - Antibiotic
5. **Omeprazole 20mg** - Acid reflux treatment
6. **Metformin 500mg** - Diabetes medication
7. **Amlodipine 5mg** - Blood pressure medication
8. **Atorvastatin 10mg** - Cholesterol medication
9. **Cetirizine 10mg** - Antihistamine/allergy relief
10. **Aspirin 75mg** - Blood thinner
11. **Losartan 50mg** - Blood pressure medication
12. **Levothyroxine 100mcg** - Thyroid medication
13. **Salbutamol Inhaler** - Asthma relief
14. **Insulin Glargine** - Diabetes medication
15. **Vitamin D3 1000IU** - Vitamin supplement

## Pharmacist Inventory Items

The following items are pre-loaded in the pharmacist's inventory with stock quantities:

| Medicine | Batch Number | Stock Quantity | Expiry Date | Status |
|----------|--------------|----------------|-------------|--------|
| Paracetamol 500mg | PAR2024001 | 500 | Dec 31, 2025 | ✅ Good Stock |
| Ibuprofen 400mg | IBU2024002 | 350 | Nov 30, 2025 | ✅ Good Stock |
| Amoxicillin 500mg | AMX2024003 | 200 | Oct 31, 2025 | ✅ Good Stock |
| Azithromycin 250mg | AZI2024004 | 150 | Mar 31, 2026 | ✅ Good Stock |
| Omeprazole 20mg | OME2024005 | 400 | Jun 30, 2026 | ✅ Good Stock |
| Metformin 500mg | MET2024006 | 600 | Aug 31, 2026 | ✅ Good Stock |
| Amlodipine 5mg | AML2024007 | 250 | May 31, 2026 | ✅ Good Stock |
| Cetirizine 10mg | CET2024008 | 80 | Sep 30, 2025 | ⚠️ Low Stock |
| Aspirin 75mg | ASP2024009 | 450 | Feb 28, 2026 | ✅ Good Stock |
| Vitamin D3 1000IU | VIT2024010 | 300 | Dec 31, 2026 | ✅ Good Stock |

## Stock Status Notes

- **Low Stock Alert**: Cetirizine 10mg has only 80 units (threshold is ≤100)
- All other medicines have adequate stock levels
- All medicines are within their expiry dates

## How to Use

### For Doctors:
1. Login as a doctor
2. Go to "Create Prescription"
3. Select a patient
4. Click "Add Medicine"
5. Use the dropdown to select from the 15 available medicines
6. Or type a custom medicine name if needed

### For Pharmacists:
1. Login as a pharmacist
2. Go to "Inventory Management"
3. View the 10 pre-loaded inventory items
4. Add more inventory items as needed
5. Update stock quantities
6. Monitor low stock alerts

## Changes Made

**File Modified**: [backend/server.js](file:///C:/Users/ELCOT/Downloads/files%20(1)/files%20(1)/backend/server.js)

- Added `defaultMedicines` array with 15 common medicines
- Added `defaultInventory` array with 10 inventory items
- Both are initialized when the server starts

## Server Restart

The server has been restarted to load the new data. You can now:
- Visit `http://localhost:3000`
- Login and test the medicine dropdown in the doctor module
- Check the inventory in the pharmacist module
