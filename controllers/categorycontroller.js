// controllers/categorycontroller.js
import pool from "../config/db.js";

// GET all categories
export const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT c.id, c.name, c.icon, c.bg_color AS bgColor, c.icon_color AS iconColor, c.open_positions AS openPositions,
              COALESCE(
                JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'id', s.id,
                    'name', s.name,
                    'openPositions', s.open_positions
                  )
                ), JSON_ARRAY()
              ) AS subcategories
       FROM categories c
       LEFT JOIN subcategories s ON c.id = s.category_id
       GROUP BY c.id`
    );
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};


// GET single category by ID
// GET single category by ID with subcategories
// GET single category by ID with subcategories
export const getCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name,
              COALESCE(
                JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'id', s.id,
                    'name', s.name,
                    'openPositions', s.open_positions
                  )
                ), JSON_ARRAY()
              ) AS subcategories
       FROM categories c
       LEFT JOIN subcategories s ON c.id = s.category_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category", details: error.message });
  }
};



// CREATE a new category
export const createCategory = async (req, res) => {
  const { name, icon, bgColor, iconColor } = req.body;

  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    const [result] = await pool.query(
      `INSERT INTO categories (name, icon, bgColor, iconColor) VALUES (?, ?, ?, ?)`,
      [name, icon, bgColor, iconColor]
    );
    res.status(201).json({ id: result.insertId, name, icon, bgColor, iconColor });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category", details: error.message });
  }
};

// UPDATE a category
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, icon, bgColor, iconColor } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE categories SET name = ?, icon = ?, bgColor = ?, iconColor = ? WHERE id = ?`,
      [name, icon, bgColor, iconColor, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category", details: error.message });
  }
};

// DELETE a category
export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM categories WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category", details: error.message });
  }
};
