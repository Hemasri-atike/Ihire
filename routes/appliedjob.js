const express = require("express");
const router = express.Router();
const { getAppliedJobs } = require("../controllers/appliedJobsController.js");

// router.get("/:id/applied-jobs", getAppliedJobs);
router.get("/applied/:id", getAppliedJobs);

module.exports = router;
