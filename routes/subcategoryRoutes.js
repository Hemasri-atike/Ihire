import express from 'express';
import {
  getSubcategoriesByCategoryName, // updated function name
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../controllers/subcategoryController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Public route: fetch subcategories by category name
router.get('/', getSubcategoriesByCategoryName);

// Admin-only routes: still require category name in URL
router.post('/:category_name', authenticate, createSubcategory);
router.put('/:category_name/:subId', authenticate, updateSubcategory);
router.delete('/:category_name/:subId', authenticate, deleteSubcategory);

export default router;
