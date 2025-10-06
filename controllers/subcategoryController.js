import pool from '../config/db.js';

// GET subcategories by category name
export const getSubcategoriesByCategoryName = async (req, res) => {
  const { category_name } = req.query;

  if (!category_name) {
    return res.status(400).json({ error: 'category_name is required' });
  }

  try {
    // Find category by name
    const [category] = await pool.query(
      `SELECT id, name FROM categories WHERE name = ?`,
      [category_name]
    );

    if (!category.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const categoryId = category[0].id;

    // Fetch subcategories
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

    res.json({ category: category[0].name, subcategories: normalizedSubcategories });
  } catch (error) {
    console.error('Error fetching subcategories by category name:', {
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

// CREATE a new subcategory by category name
export const createSubcategory = async (req, res) => {
  const { category_name } = req.params; // assume category_name in params
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [category] = await pool.query(
      `SELECT id FROM categories WHERE name = ?`,
      [category_name]
    );

    if (!category.length) return res.status(404).json({ error: 'Category not found' });

    const categoryId = category[0].id;

    const [result] = await pool.query(
      `INSERT INTO subcategories (name, category_id) VALUES (?, ?)`,
      [name, categoryId]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      category_id: categoryId,
      open_positions: 0,
    });
  } catch (error) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ error: 'Failed to create subcategory', details: error.message });
  }
};

// UPDATE subcategory by category name
export const updateSubcategory = async (req, res) => {
  const { category_name, subId } = req.params;
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const [category] = await pool.query(
      `SELECT id FROM categories WHERE name = ?`,
      [category_name]
    );
    if (!category.length) return res.status(404).json({ error: 'Category not found' });

    const categoryId = category[0].id;
    const subIdNum = parseInt(subId, 10);
    if (isNaN(subIdNum)) return res.status(400).json({ error: 'Invalid subId' });

    const [result] = await pool.query(
      `UPDATE subcategories SET name = ? WHERE id = ? AND category_id = ?`,
      [name, subIdNum, categoryId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Subcategory not found' });

    res.json({ message: 'Subcategory updated successfully' });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ error: 'Failed to update subcategory', details: error.message });
  }
};

// DELETE subcategory by category name
export const deleteSubcategory = async (req, res) => {
  const { category_name, subId } = req.params;

  try {
    const [category] = await pool.query(
      `SELECT id FROM categories WHERE name = ?`,
      [category_name]
    );
    if (!category.length) return res.status(404).json({ error: 'Category not found' });

    const categoryId = category[0].id;
    const subIdNum = parseInt(subId, 10);
    if (isNaN(subIdNum)) return res.status(400).json({ error: 'Invalid subId' });

    const [result] = await pool.query(
      `DELETE FROM subcategories WHERE id = ? AND category_id = ?`,
      [subIdNum, categoryId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Subcategory not found' });

    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ error: 'Failed to delete subcategory', details: error.message });
  }
};
