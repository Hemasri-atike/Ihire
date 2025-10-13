import express from "express";
import { getAllCategories ,getJobsByCategorySlug} from "../controllers/categoryController.js"; // make sure casing matches

const router = express.Router();

router.get("/", getAllCategories);
router.get("/:categorySlug", getJobsByCategorySlug);

export default router;
