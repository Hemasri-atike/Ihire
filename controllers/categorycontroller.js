import pool from '../config/db.js';

// List of valid lucide-react icons for validation
const validIcons = ['Code', 'Heart', 'Briefcase', 'PenTool', 'Book'];

// GET all categories
export const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.bg_color AS bgColor,
        c.icon_color AS iconColor,
        COUNT(j.id) AS openPositions
      FROM categories c
      LEFT JOIN jobs j ON c.id = j.category_id
      WHERE j.deleted_at IS NULL OR j.id IS NULL
      GROUP BY c.id, c.name, c.icon, c.bg_color, c.icon_color
    `);

    const normalizedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name || 'Unnamed Category',
      icon: validIcons.includes(cat.icon) ? cat.icon : 'Briefcase',
      bgColor: cat.bgColor || 'bg-blue-100',
      iconColor: cat.iconColor || 'text-blue-700',
      openPositions: Number(cat.openPositions) || 0,
    }));

    res.json(normalizedCategories);
  } catch (error) {
    console.log("err",error)
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
};

// GET single category by ID
export const getCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const [categories] = await pool.query(
      `
      SELECT 
        c.id,
        c.name,
        c.icon,
        c.bg_color AS bgColor,
        c.icon_color AS iconColor,
        COUNT(j.id) AS openPositions
      FROM categories c
      LEFT JOIN jobs j ON c.id = j.category_id
      WHERE c.id = ? AND (j.deleted_at IS NULL OR j.id IS NULL)
      GROUP BY c.id, c.name, c.icon, c.bg_color, c.icon_color
      `,
      [id]
    );

    if (!categories.length) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = {
      id: categories[0].id,
      name: categories[0].name || 'Unnamed Category',
      icon: validIcons.includes(categories[0].icon) ? categories[0].icon : 'Briefcase',
      bgColor: categories[0].bgColor || 'bg-blue-100',
      iconColor: categories[0].iconColor || 'text-blue-700',
      openPositions: Number(categories[0].openPositions) || 0,
    };

    res.json(category);
  } catch (error) {
    console.log("er",error)
    res.status(500).json({ error: 'Failed to fetch category', details: error.message });
  }
};

// CREATE a new category
export const createCategory = async (req, res) => {
  const { name, icon, bgColor, iconColor } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (icon && !validIcons.includes(icon)) {
    return res.status(400).json({ error: `Invalid icon. Must be one of: ${validIcons.join(', ')}` });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO categories (name, icon, bg_color, icon_color) VALUES (?, ?, ?, ?)`,
      [name, icon || 'Briefcase', bgColor || 'bg-blue-100', iconColor || 'text-blue-700']
    );

    const newCategory = {
      id: result.insertId,
      name,
      icon: icon || 'Briefcase',
      bgColor: bgColor || 'bg-blue-100',
      iconColor: iconColor || 'text-blue-700',
      openPositions: 0,
    };

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
};

// UPDATE a category
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, icon, bgColor, iconColor } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (icon && !validIcons.includes(icon)) {
    return res.status(400).json({ error: `Invalid icon. Must be one of: ${validIcons.join(', ')}` });
  }

  try {
    const [result] = await pool.query(
      `UPDATE categories SET name = ?, icon = ?, bg_color = ?, icon_color = ? WHERE id = ?`,
      [name, icon || 'Briefcase', bgColor || 'bg-blue-100', iconColor || 'text-blue-700', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
};

// DELETE a category
export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(`DELETE FROM categories WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category', details: error.message });
  }
};