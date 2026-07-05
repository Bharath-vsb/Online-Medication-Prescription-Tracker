const db = require('../../config/database');

/**
 * Inventory Tool
 *
 * Read-only queries for pharmacist stock management.
 * Expiry and low-stock flags are computed at query time by MySQL.
 *
 * SECURITY: SELECT queries only. No INSERT, UPDATE, or DELETE.
 */

/**
 * Get the complete inventory list with computed expiry and low-stock flags.
 *
 * @returns {Promise<Array>}
 */
const getAllInventory = async () => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.name                              AS medicine_name,
            i.batch_number,
            i.expiry_date,
            i.stock_quantity,
            (i.expiry_date < CURDATE())         AS is_expired,
            (i.stock_quantity <= 100)           AS is_low_stock,
            i.created_at
         FROM inventory i
         JOIN medicines m ON i.medicine_id = m.id
         ORDER BY i.created_at DESC`
    );
    return rows;
};

/**
 * Get inventory items where stock is at or below 100 units.
 *
 * @returns {Promise<Array>}
 */
const getLowStockItems = async () => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.name       AS medicine_name,
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
 * Get inventory items that have passed their expiry date.
 *
 * @returns {Promise<Array>}
 */
const getExpiredItems = async () => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            m.name       AS medicine_name,
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
 * Get all inventory batches for a specific medicine.
 *
 * @param {number} medicineId
 * @returns {Promise<Array>}
 */
const getInventoryByMedicine = async (medicineId) => {
    const [rows] = await db.query(
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
    return rows;
};

/**
 * Get total non-expired stock quantity across all batches for a medicine.
 *
 * @param {number} medicineId
 * @returns {Promise<{total_stock: number}>}
 */
const getTotalStockForMedicine = async (medicineId) => {
    const [rows] = await db.query(
        `SELECT COALESCE(SUM(stock_quantity), 0) AS total_stock
         FROM inventory
         WHERE medicine_id = ?
           AND expiry_date >= CURDATE()`,
        [medicineId]
    );
    return rows[0];
};

module.exports = {
    getAllInventory,
    getLowStockItems,
    getExpiredItems,
    getInventoryByMedicine,
    getTotalStockForMedicine,
};
