import express from 'express';
import {
  getSubcategoriesByCategoryId,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../controllers/subcategoryController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Public route
router.get('/', getSubcategoriesByCategoryId);

// Admin-only routes
router.post('/:categoryId', authenticate, createSubcategory);
router.put('/:categoryId/:subId', authenticate, updateSubcategory);
router.delete('/:categoryId/:subId', authenticate, deleteSubcategory);

export default router;