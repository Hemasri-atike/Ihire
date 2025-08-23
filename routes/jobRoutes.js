
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

// Public route - anyone can view jobs
router.get("/", jobController.getJobs);

// Protected routes - any logged-in user can create/update/delete jobs
router.post("/", authenticate, jobController.createJob);
router.put("/:id", authenticate, jobController.updateJob);
router.delete("/:id", authenticate, jobController.deleteJob);

export default router;
