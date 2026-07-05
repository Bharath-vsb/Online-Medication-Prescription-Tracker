const db = require('../../config/database');

/**
 * Medicine Tool
 *
 * Read-only queries for the medicines master list.
 * Supports lookup, search, and stock availability checks.
 *
 * SECURITY: SELECT queries only. No INSERT, UPDATE, or DELETE.
 */

/**
 * Get all medicines in the master list ordered alphabetically.
 *
 * @returns {Promise<Array>}
 */
const getAllMedicines = async () => {
    const [rows] = await db.query(
        `SELECT id, name, created_at
         FROM medicines
         ORDER BY name ASC`
    );
    return rows;
};

/**
 * Search for medicines by partial name match (case-insensitive).
 *
 * @param {string} searchTerm
 * @returns {Promise<Array>}
 */
const searchMedicinesByName = async (searchTerm) => {
    const [rows] = await db.query(
        `SELECT id, name, created_at
         FROM medicines
         WHERE name LIKE CONCAT('%', ?, '%')
         ORDER BY name ASC
         LIMIT 20`,
        [searchTerm]
    );
    return rows;
};

/**
 * Get a single medicine record by its ID.
 *
 * @param {number} medicineId
 * @returns {Promise<object|null>}
 */
const getMedicineById = async (medicineId) => {
    const [rows] = await db.query(
        `SELECT id, name, created_at
         FROM medicines
         WHERE id = ?`,
        [medicineId]
    );
    return rows[0] || null;
};

/**
 * Check whether a medicine has valid (non-expired, > 0 quantity) stock.
 * Returns an object with an in_stock boolean and available quantity.
 *
 * @param {number} medicineId
 * @returns {Promise<{in_stock: boolean, available_quantity: number}>}
 */
const isMedicineInStock = async (medicineId) => {
    const [rows] = await db.query(
        `SELECT
            COALESCE(SUM(stock_quantity), 0) AS available_quantity
         FROM inventory
         WHERE medicine_id = ?
           AND expiry_date >= CURDATE()
           AND stock_quantity > 0`,
        [medicineId]
    );
    const available = rows[0].available_quantity;
    return {
        in_stock: available > 0,
        available_quantity: available,
    };
};

module.exports = {
    getAllMedicines,
    searchMedicinesByName,
    getMedicineById,
    isMedicineInStock,
};
