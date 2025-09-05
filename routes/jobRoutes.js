
// import express from "express";
// import jobController from "../controllers/jobcontroller.js";
// import authenticate from "../middleware/auth.js";

// const router = express.Router();

// // Public route (anyone can view jobs)
// router.get("/", jobController.getJobs);

// // Protected routes (only logged-in users can manage jobs)
// router.post("/", authenticate, jobController.createJob);
// router.put("/:id", authenticate, jobController.updateJob);
// router.delete("/:id", authenticate, jobController.deleteJob);

// export default router;
// import express from "express";
// import jobController from "../controllers/jobcontroller.js";
// import authenticate from "../middleware/auth.js";
// import authorize from "../middleware/authorize.js";

// const router = express.Router();

// // Public route
// router.get("/", jobController.getJobs);

// // Protected routes
// router.post("/", authenticate, authorize("admin", "employer"), jobController.createJob);
// router.put("/:id", authenticate, authorize("admin", "employer"), jobController.updateJob);
// router.delete("/:id", authenticate, authorize("admin", "employer"), jobController.deleteJob);

// export default router;
import express from "express";
import jobController from "../controllers/jobcontroller.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, jobController.getJobs);

// Protected routes - Only employers/admins
router.post("/", authenticate,  jobController.createJob);
router.patch("/:id", authenticate,  jobController.updateJob);
router.delete("/:id", authenticate, jobController.deleteJob);
router.post("/bulk-delete", authenticate, jobController.bulkDeleteJobs);
router.post("/:id/views", authenticate,jobController.incrementJobViews);
router.get("/categories",authenticate, jobController.getCategories);


export default router;
