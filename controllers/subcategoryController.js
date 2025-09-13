import pool from '../config/db.js';

export const getSubcategoriesByCategoryId = async (req, res) => {
  const { category_id } = req.query;

  if (!category_id) {
    return res.status(400).json({ error: 'category_id is required' });
  }

  const categoryId = parseInt(category_id, 10);
  if (isNaN(categoryId)) {
    return res.status(400).json({ error: 'category_id must be a valid number' });
  }

  try {
    const [category] = await pool.query(
      `SELECT id FROM categories WHERE id = ?`,
      [categoryId]
    );
    if (!category.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const sql = `
      SELECT 
        s.id,
        s.name,
        s.category_id,
        COUNT(j.id) AS open_positions
      FROM subcategories s
      LEFT JOIN jobs j ON s.id = j.subcategory_id AND j.deleted_at IS NULL
      WHERE s.category_id = ?
      GROUP BY s.id, s.name, s.category_id
      LIMIT 0, 25
    `;
    const [subcategories] = await pool.query(sql, [categoryId]);

    const normalizedSubcategories = subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name || 'Unnamed Subcategory',
      open_positions: Number(sub.open_positions) || 0,
      category_id: sub.category_id,
    }));

    res.json({ subcategories: normalizedSubcategories });
  } catch (error) {
    console.error('Error in getSubcategoriesByCategoryId:', {
      message: error.message,
      code: error.code || 'N/A',
      sqlMessage: error.sqlMessage || 'N/A',
      stack: error.stack,
    });
    res.status(500).json({ 
      error: 'Failed to fetch subcategories', 
      details: error.message,
      code: error.code || 'N/A',
      sqlMessage: error.sqlMessage || 'N/A',
    });
  }
};

export const createSubcategory = async (req, res) => {
  const { categoryId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const categoryIdNum = parseInt(categoryId, 10);
  if (isNaN(categoryIdNum)) {
    return res.status(400).json({ error: 'categoryId must be a valid number' });
  }

  try {
    const [category] = await pool.query(
      `SELECT id FROM categories WHERE id = ?`,
      [categoryIdNum]
    );
    if (!category.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO subcategories (name, category_id) VALUES (?, ?)`,
      [name, categoryIdNum]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      category_id: categoryIdNum,
      open_positions: 0,
    });
  } catch (error) {
    console.error('Error in createSubcategory:', {
      message: error.message,
      code: error.code || 'N/A',
      sqlMessage: error.sqlMessage || 'N/A',
      stack: error.stack,
    });
    res.status(500).json({ 
      error: 'Failed to create subcategory', 
      details: error.message,
    });
  }
};

export const updateSubcategory = async (req, res) => {
  const { categoryId, subId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const categoryIdNum = parseInt(categoryId, 10);
  const subIdNum = parseInt(subId, 10);
  if (isNaN(categoryIdNum) || isNaN(subIdNum)) {
    return res.status(400).json({ error: 'categoryId and subId must be valid numbers' });
  }

  try {
    const [subcategory] = await pool.query(
      `SELECT id FROM subcategories WHERE id = ? AND category_id = ?`,
      [subIdNum, categoryIdNum]
    );
    if (!subcategory.length) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    const [result] = await pool.query(
      `UPDATE subcategories SET name = ? WHERE id = ? AND category_id = ?`,
      [name, subIdNum, categoryIdNum]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    res.json({ message: 'Subcategory updated successfully' });
  } catch (error) {
    console.error('Error in updateSubcategory:', {
      message: error.message,
      code: error.code || 'N/A',
      sqlMessage: error.sqlMessage || 'N/A',
      stack: error.stack,
    });
    res.status(500).json({ 
      error: 'Failed to update subcategory', 
      details: error.message,
    });
  }
};

// DELETE subcategory
export const deleteSubcategory = async (req, res) => {
  const { categoryId, subId } = req.params;

  const categoryIdNum = parseInt(categoryId, 10);
  const subIdNum = parseInt(subId, 10);
  if (isNaN(categoryIdNum) || isNaN(subIdNum)) {
    return res.status(400).json({ error: 'categoryId and subId must be valid numbers' });
  }

  try {
    const [result] = await pool.query(
      `DELETE FROM subcategories WHERE id = ? AND category_id = ?`,
      [subIdNum, categoryIdNum]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error in deleteSubcategory:', {
      message: error.message,
      code: error.code || 'N/A',
      sqlMessage: error.sqlMessage || 'N/A',
      stack: error.stack,
    });
    res.status(500).json({ 
      error: 'Failed to delete subcategory', 
      details: error.message,
    });
  }
};
