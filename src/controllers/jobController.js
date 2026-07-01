const Job = require("../models/Job");
const { publishJob } = require("../services/qstashService");

/**
 * Job Controller — handles the frontend-facing API endpoints.
 *
 * Two responsibilities:
 *  1. createJob:   Accept a task request, save to DB, publish to QStash, respond fast.
 *  2. getJobStatus: Return the current state of a job for frontend polling.
 */

/**
 * POST /api/jobs
 * Creates a new job, saves it to MongoDB, and publishes it to QStash.
 *
 * Flow:
 *  Frontend clicks "Start Task"
 *    → POST /api/jobs { taskType: "photo_generation" }
 *    → Backend creates DB record (PENDING)
 *    → Backend publishes message to QStash
 *    → Backend updates DB with QStash messageId
 *    → Backend responds with job info (frontend starts polling)
 */
const createJob = async (req, res) => {
  try {
    const { taskType } = req.body;

    // Validate taskType
    const validTypes = ["photo_generation", "video_generation", "ad_copy", "target_audience"];
    if (!taskType || !validTypes.includes(taskType)) {
      return res.status(400).json({
        error: `Invalid taskType. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Step 1: Create job record in MongoDB with PENDING status
    const job = new Job({
      taskType,
      status: "PENDING",
      statusHistory: [
        {
          status: "PENDING",
          timestamp: new Date(),
          message: "Job created and queued",
        },
      ],
    });
    await job.save();

    console.log(`📝 Job created: ${job.jobId} (${taskType})`);

    // Step 2: Publish to QStash for async processing
    const qstashResponse = await publishJob({
      jobId: job.jobId,
      taskType: job.taskType,
    });

    // Step 3: Store the QStash message ID for correlation
    job.qstashMessageId = qstashResponse.messageId;
    await job.save();

    console.log(`📤 Job ${job.jobId} queued via QStash → ${qstashResponse.messageId}`);

    // Step 4: Respond immediately — frontend should start polling
    return res.status(201).json({
      success: true,
      message: "Job queued successfully",
      job: {
        jobId: job.jobId,
        taskType: job.taskType,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error creating job:", error.message);
    return res.status(500).json({ error: "Failed to create job" });
  }
};

/**
 * GET /api/jobs/:jobId/status
 * Returns the current state of a job — used by frontend polling.
 *
 * The frontend calls this every 2-3 seconds while a job is active.
 * We return all the fields the UI needs to render progress.
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({ jobId }).lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.status(200).json({
      success: true,
      job: {
        jobId: job.jobId,
        taskType: job.taskType,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        statusHistory: job.statusHistory,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching job status:", error.message);
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
};

/**
 * GET /api/jobs
 * Returns all jobs — useful for the dashboard view.
 * Sorted by most recent first.
 */
const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs: jobs.map((job) => ({
        jobId: job.jobId,
        taskType: job.taskType,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching jobs:", error.message);
    return res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

module.exports = { createJob, getJobStatus, getAllJobs };
