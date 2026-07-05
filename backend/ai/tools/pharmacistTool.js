const db = require('../../config/database');

/**
 * Pharmacist Tool — Phase 4
 *
 * READ queries for inventory, sales, dispensary, and analytics.
 * WRITE operations: inventory management + dispense workflow.
 *
 * SECURITY:
 *  - Pharmacists cannot modify prescriptions (doctor-owned).
 *  - Pharmacists cannot access patient personal records or doctor records.
 *  - dispensePrescription enforces prescription existence + active status before mutating.
 *  - All stock mutations are guarded by sufficiency checks.
 */

// ---------------------------------------------------------------------------
// READ — Profile
// ---------------------------------------------------------------------------

const getPharmacistProfile = async (pharmacistId) => {
    const [rows] = await db.query(
        `SELECT id, full_name, email, mobile, status, created_at
         FROM users
         WHERE id   = ?
           AND role = 'pharmacist'`,
        [pharmacistId]
    );
    return rows[0] || null;
};

// ---------------------------------------------------------------------------
// READ — Inventory (extended)
// ---------------------------------------------------------------------------

/**
 * Full inventory list with computed flags.
 */
const getAllInventory = async () => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.id                                AS medicine_id,
            m.name                              AS medicine_name,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity,
            (i.expiry_date < CURDATE())         AS is_expired,
            (i.stock_quantity <= 100)           AS is_low_stock,
            i.created_at
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         ORDER BY m.name ASC, i.expiry_date ASC`
    );
    return rows;
};

/**
 * Search inventory by medicine name (partial match).
 */
const searchInventoryByMedicineName = async (name) => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.id                                AS medicine_id,
            m.name                              AS medicine_name,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity,
            (i.expiry_date < CURDATE())         AS is_expired,
            (i.stock_quantity <= 100)           AS is_low_stock
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE m.name LIKE CONCAT('%', ?, '%')
         ORDER BY i.expiry_date ASC`,
        [name]
    );
    return rows;
};

/**
 * Search inventory by batch number (exact or partial).
 */
const searchInventoryByBatchNumber = async (batchNumber) => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.id                                AS medicine_id,
            m.name                              AS medicine_name,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity,
            (i.expiry_date < CURDATE())         AS is_expired
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE i.batch_number LIKE CONCAT('%', ?, '%')
         ORDER BY i.expiry_date ASC`,
        [batchNumber]
    );
    return rows;
};

/**
 * All batches for a specific medicine_id with totals.
 */
const getMedicineInventoryDetails = async (medicineId) => {
    const [batches] = await db.query(
        `SELECT
            i.id,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity,
            (i.expiry_date < CURDATE()) AS is_expired
         FROM inventory i
         WHERE i.medicine_id = ?
         ORDER BY i.expiry_date ASC`,
        [medicineId]
    );
    const [[{ total_stock }]] = await db.query(
        `SELECT COALESCE(SUM(stock_quantity), 0) AS total_stock
         FROM inventory
         WHERE medicine_id = ? AND expiry_date >= CURDATE()`,
        [medicineId]
    );
    const [[med]] = await db.query(`SELECT id, name FROM medicines WHERE id = ?`, [medicineId]);
    return { medicine: med, batches, total_valid_stock: total_stock };
};

/**
 * Stock availability check for a medicine.
 */
const checkMedicineAvailability = async (medicineId) => {
    const [[data]] = await db.query(
        `SELECT
            COALESCE(SUM(stock_quantity), 0) AS available_quantity,
            COUNT(*)                          AS batch_count
         FROM inventory
         WHERE medicine_id = ?
           AND expiry_date >= CURDATE()
           AND stock_quantity > 0`,
        [medicineId]
    );
    const [[med]] = await db.query(`SELECT name FROM medicines WHERE id = ?`, [medicineId]);
    return {
        medicine_name:      med ? med.name : null,
        in_stock:           data.available_quantity > 0,
        available_quantity: data.available_quantity,
        valid_batch_count:  data.batch_count,
    };
};

/**
 * Low stock items (≤ 100 units).
 */
const getLowStockItems = async () => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.id           AS medicine_id,
            m.name         AS medicine_name,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE i.stock_quantity <= 100
         ORDER BY i.stock_quantity ASC`
    );
    return rows;
};

/**
 * Expired inventory items.
 */
const getExpiredItems = async () => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.id           AS medicine_id,
            m.name         AS medicine_name,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE i.expiry_date < CURDATE()
         ORDER BY i.expiry_date ASC`
    );
    return rows;
};

/**
 * Medicines expiring within the current calendar month.
 */
const getMedicinesExpiringThisMonth = async () => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.id           AS medicine_id,
            m.name         AS medicine_name,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE YEAR(i.expiry_date)  = YEAR(CURDATE())
           AND MONTH(i.expiry_date) = MONTH(CURDATE())
           AND i.expiry_date       >= CURDATE()
         ORDER BY i.expiry_date ASC`
    );
    return rows;
};

/**
 * Inventory summary: totals and health indicators.
 */
const getInventorySummaryPharmacist = async () => {
    const [[data]] = await db.query(
        `SELECT
            COUNT(*)                                                           AS total_batches,
            COUNT(DISTINCT medicine_id)                                        AS total_medicines,
            COALESCE(SUM(stock_quantity), 0)                                   AS total_units,
            SUM(CASE WHEN stock_quantity <= 100 THEN 1 ELSE 0 END)             AS low_stock_batches,
            SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END)           AS expired_batches,
            SUM(CASE WHEN YEAR(expiry_date)  = YEAR(CURDATE())
                      AND MONTH(expiry_date) = MONTH(CURDATE())
                      AND expiry_date       >= CURDATE() THEN 1 ELSE 0 END)    AS expiring_this_month
         FROM inventory`
    );
    return data;
};

// ---------------------------------------------------------------------------
// READ — Dispensary / Prescriptions
// ---------------------------------------------------------------------------

const getPendingPrescriptionsForDispensary = async () => {
    const [rows] = await db.query(
        `SELECT
            p.id,
            p.prescription_group_id,
            m.id              AS medicine_id,
            m.name            AS medicine_name,
            p.total_quantity,
            p.frequency,
            p.start_date,
            p.end_date,
            d.full_name       AS doctor_name,
            pt.full_name      AS patient_name,
            p.created_at
         FROM prescriptions p
         JOIN medicines m  ON p.medicine_id = m.id
         JOIN users     d  ON p.doctor_id   = d.id
         JOIN users     pt ON p.patient_id  = pt.id
         WHERE p.status = 'active'
           AND p.bought = FALSE
         ORDER BY p.created_at ASC`
    );
    return rows;
};

// ---------------------------------------------------------------------------
// READ — Sales / Analytics
// ---------------------------------------------------------------------------

const getSalesHistory = async (days = 30) => {
    const [rows] = await db.query(
        `SELECT
            sm.id,
            m.name            AS medicine_name,
            sm.quantity,
            sm.sold_at,
            d.full_name       AS doctor_name,
            pt.full_name      AS patient_name,
            p.id              AS prescription_id
         FROM sold_medicines sm
         JOIN prescriptions p  ON sm.prescription_id = p.id
         JOIN medicines     m  ON sm.medicine_id     = m.id
         JOIN users         d  ON p.doctor_id        = d.id
         JOIN users         pt ON p.patient_id       = pt.id
         WHERE sm.sold_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         ORDER BY sm.sold_at DESC`,
        [days]
    );
    return rows;
};

const getTodaySales = async () => getSalesHistory(1);
const getWeeklySales = async () => getSalesHistory(7);
const getMonthlySales = async () => getSalesHistory(30);

const getPharmacistAnalytics = async () => {
    const [[stockStats]] = await db.query(
        `SELECT
            COUNT(*)                                                  AS total_inventory_batches,
            COUNT(DISTINCT medicine_id)                               AS total_medicines,
            COALESCE(SUM(stock_quantity), 0)                          AS total_units_in_stock,
            SUM(CASE WHEN stock_quantity <= 100 THEN 1 ELSE 0 END)    AS low_stock_count,
            SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END)  AS expired_count
         FROM inventory`
    );
    const [[salesStats]] = await db.query(
        `SELECT
            COUNT(*) AS total_dispenses,
            COALESCE(SUM(quantity), 0) AS total_units_dispensed
         FROM sold_medicines
         WHERE sold_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const [[pendingCount]] = await db.query(
        `SELECT COUNT(*) AS pending_prescriptions
         FROM prescriptions
         WHERE status = 'active' AND bought = FALSE`
    );
    return { ...stockStats, ...salesStats, ...pendingCount };
};

const checkStockSufficiency = async (medicineId, requiredQuantity) => {
    const [[data]] = await db.query(
        `SELECT COALESCE(SUM(stock_quantity), 0) AS available_quantity
         FROM inventory
         WHERE medicine_id = ?
           AND expiry_date >= CURDATE()`,
        [medicineId]
    );
    return {
        sufficient:         data.available_quantity >= requiredQuantity,
        available_quantity: data.available_quantity,
        required_quantity:  requiredQuantity,
    };
};

// ---------------------------------------------------------------------------
// WRITE — Inventory Management
// ---------------------------------------------------------------------------

/**
 * Add a new inventory batch.
 *
 * @param {number} medicineId
 * @param {string} batchNumber
 * @param {string} expiryDate      — YYYY-MM-DD
 * @param {number} stockQuantity
 */
const addInventory = async (medicineId, batchNumber, expiryDate, stockQuantity) => {
    const [[med]] = await db.query(`SELECT id, name FROM medicines WHERE id = ?`, [medicineId]);
    if (!med) throw new Error(`Medicine ID ${medicineId} not found.`);
    if (stockQuantity <= 0) throw new Error('Stock quantity must be greater than zero.');

    const [result] = await db.query(
        `INSERT INTO inventory (medicine_id, batch_number, expiry_date, stock_quantity)
         VALUES (?, ?, ?, ?)`,
        [medicineId, batchNumber, expiryDate, stockQuantity]
    );
    return {
        success:          true,
        inventoryId:      result.insertId,
        medicineName:     med.name,
        batchNumber,
        expiryDate,
        stockQuantity,
    };
};

/**
 * Increase stock for an existing inventory batch.
 *
 * @param {number} inventoryId
 * @param {number} quantity
 */
const increaseStock = async (inventoryId, quantity) => {
    const [[row]] = await db.query(
        `SELECT i.id, i.stock_quantity, m.name AS medicine_name, i.batch_number
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE i.id = ?`,
        [inventoryId]
    );
    if (!row) throw new Error(`Inventory batch ID ${inventoryId} not found.`);
    if (quantity <= 0) throw new Error('Quantity to add must be greater than zero.');

    await db.query(
        `UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE id = ?`,
        [quantity, inventoryId]
    );
    return {
        success:           true,
        inventoryId,
        medicineName:      row.medicine_name,
        batchNumber:       row.batch_number,
        previousQuantity:  row.stock_quantity,
        addedQuantity:     quantity,
        newQuantity:       row.stock_quantity + quantity,
    };
};

/**
 * Reduce stock for an existing inventory batch.
 * Used for manual stock adjustments (not dispense — use dispensePrescription for that).
 *
 * @param {number} inventoryId
 * @param {number} quantity
 */
const reduceStock = async (inventoryId, quantity) => {
    const [[row]] = await db.query(
        `SELECT i.id, i.stock_quantity, m.name AS medicine_name, i.batch_number
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE i.id = ?`,
        [inventoryId]
    );
    if (!row) throw new Error(`Inventory batch ID ${inventoryId} not found.`);
    if (quantity <= 0) throw new Error('Quantity to reduce must be greater than zero.');
    if (quantity > row.stock_quantity) {
        throw new Error(`Cannot reduce by ${quantity}. Only ${row.stock_quantity} units available in this batch.`);
    }

    await db.query(
        `UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE id = ?`,
        [quantity, inventoryId]
    );
    return {
        success:           true,
        inventoryId,
        medicineName:      row.medicine_name,
        batchNumber:       row.batch_number,
        previousQuantity:  row.stock_quantity,
        reducedQuantity:   quantity,
        newQuantity:       row.stock_quantity - quantity,
    };
};

/**
 * Update expiry date for an inventory batch.
 *
 * @param {number} inventoryId
 * @param {string} newExpiryDate — YYYY-MM-DD
 */
const updateExpiryDate = async (inventoryId, newExpiryDate) => {
    const [[row]] = await db.query(
        `SELECT i.id, i.batch_number, m.name AS medicine_name, i.expiry_date
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE i.id = ?`,
        [inventoryId]
    );
    if (!row) throw new Error(`Inventory batch ID ${inventoryId} not found.`);

    await db.query(`UPDATE inventory SET expiry_date = ? WHERE id = ?`, [newExpiryDate, inventoryId]);
    return {
        success:         true,
        inventoryId,
        medicineName:    row.medicine_name,
        batchNumber:     row.batch_number,
        previousExpiry:  row.expiry_date,
        newExpiryDate,
    };
};

/**
 * Update batch number for an inventory batch.
 *
 * @param {number} inventoryId
 * @param {string} newBatchNumber
 */
const updateBatchDetails = async (inventoryId, newBatchNumber) => {
    const [[row]] = await db.query(
        `SELECT i.id, i.batch_number, m.name AS medicine_name
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         WHERE i.id = ?`,
        [inventoryId]
    );
    if (!row) throw new Error(`Inventory batch ID ${inventoryId} not found.`);

    await db.query(`UPDATE inventory SET batch_number = ? WHERE id = ?`, [newBatchNumber, inventoryId]);
    return {
        success:            true,
        inventoryId,
        medicineName:       row.medicine_name,
        previousBatchNumber: row.batch_number,
        newBatchNumber,
    };
};

// ---------------------------------------------------------------------------
// WRITE — Dispense Workflow
// ---------------------------------------------------------------------------

/**
 * Full dispense workflow for a prescription.
 *
 * Steps:
 *  1. Verify prescription exists and is active.
 *  2. Verify not already dispensed (bought = false).
 *  3. Verify sufficient non-expired stock.
 *  4. Deduct stock (FIFO: oldest expiry first).
 *  5. Insert sold_medicines record.
 *  6. Mark prescription as bought = true.
 *
 * @param {number} prescriptionId
 * @returns {Promise<object>}
 */
const dispensePrescription = async (prescriptionId) => {
    // 1 & 2: Verify prescription
    const [[prescription]] = await db.query(
        `SELECT
            p.id, p.medicine_id, p.total_quantity, p.status, p.bought,
            m.name AS medicine_name,
            pt.full_name AS patient_name
         FROM prescriptions p
         JOIN medicines m ON p.medicine_id = m.id
         JOIN users pt    ON p.patient_id  = pt.id
         WHERE p.id = ?`,
        [prescriptionId]
    );
    if (!prescription) {
        throw new Error(`Prescription ID ${prescriptionId} not found.`);
    }
    if (prescription.status !== 'active') {
        throw new Error(`Prescription ID ${prescriptionId} cannot be dispensed — status is "${prescription.status}".`);
    }
    if (prescription.bought) {
        throw new Error(`Prescription ID ${prescriptionId} has already been dispensed.`);
    }

    const { medicine_id, total_quantity, medicine_name, patient_name } = prescription;

    // 3: Check stock sufficiency
    const [[stockCheck]] = await db.query(
        `SELECT COALESCE(SUM(stock_quantity), 0) AS available
         FROM inventory
         WHERE medicine_id = ? AND expiry_date >= CURDATE()`,
        [medicine_id]
    );
    if (stockCheck.available < total_quantity) {
        throw new Error(
            `Insufficient stock for ${medicine_name}. ` +
            `Required: ${total_quantity}, Available: ${stockCheck.available}.`
        );
    }

    // 4: Deduct stock FIFO (oldest expiry first)
    const [batches] = await db.query(
        `SELECT id, stock_quantity
         FROM inventory
         WHERE medicine_id = ? AND expiry_date >= CURDATE() AND stock_quantity > 0
         ORDER BY expiry_date ASC`,
        [medicine_id]
    );

    let remaining = total_quantity;
    for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, batch.stock_quantity);
        await db.query(
            `UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE id = ?`,
            [deduct, batch.id]
        );
        remaining -= deduct;
    }

    // 5: Record sale
    await db.query(
        `INSERT INTO sold_medicines (prescription_id, medicine_id, quantity)
         VALUES (?, ?, ?)`,
        [prescriptionId, medicine_id, total_quantity]
    );

    // 6: Mark prescription as bought
    await db.query(
        `UPDATE prescriptions SET bought = TRUE WHERE id = ?`,
        [prescriptionId]
    );

    return {
        success:        true,
        prescriptionId,
        medicineName:   medicine_name,
        patientName:    patient_name,
        quantityDispensed: total_quantity,
        remainingStock: stockCheck.available - total_quantity,
    };
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    // Read — profile
    getPharmacistProfile,
    // Read — inventory
    getAllInventory,
    searchInventoryByMedicineName,
    searchInventoryByBatchNumber,
    getMedicineInventoryDetails,
    checkMedicineAvailability,
    getLowStockItems,
    getExpiredItems,
    getMedicinesExpiringThisMonth,
    getInventorySummaryPharmacist,
    // Read — dispensary
    getPendingPrescriptionsForDispensary,
    // Read — sales / analytics
    getSalesHistory,
    getTodaySales,
    getWeeklySales,
    getMonthlySales,
    getPharmacistAnalytics,
    checkStockSufficiency,
    // Write — inventory
    addInventory,
    increaseStock,
    reduceStock,
    updateExpiryDate,
    updateBatchDetails,
    // Write — dispense
    dispensePrescription,
};
