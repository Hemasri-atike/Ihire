import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categorycontroller.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Category routes
router.get('/getCategories', getCategories);
router.get('/:id', getCategoryById);
router.post('/createcategory', authenticate, createCategory);
router.put('/:id', authenticate, updateCategory);
router.delete('/:id', authenticate, deleteCategory);

export default router;
