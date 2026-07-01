const express = require("express");
const router = express.Router();
const { createJob, getJobStatus, getAllJobs } = require("../controllers/jobController");

/**
 * Job Routes — frontend-facing API
 *
 * POST   /api/jobs              → Create a new job (triggers the whole pipeline)
 * GET    /api/jobs               → List all jobs (dashboard)
 * GET    /api/jobs/:jobId/status → Poll a specific job's status (frontend polling)
 */

router.post("/", createJob);
router.get("/", getAllJobs);
router.get("/:jobId/status", getJobStatus);

module.exports = router;
