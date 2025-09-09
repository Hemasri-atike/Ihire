import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categorycontroller.js';
import authenticate from '../middleware/auth.js';
// import { isAdmin } from '../middleware/role.js'; // New middleware to check for admin role

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin-only routes
router.post('/', authenticate,  createCategory);
router.put('/:id', authenticate,  updateCategory);
router.delete('/:id', authenticate, deleteCategory);

export default router;