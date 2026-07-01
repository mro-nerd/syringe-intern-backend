const Job = require("../models/Job");

/**
 * Processing Service — simulates a time-consuming AI generation task.
 *
 * In production (syringe.ai), this would call external AI APIs like
 * Stability AI, Runway, or OpenAI. Here we simulate the work with
 * deterministic delays and incremental progress updates.
 *
 * Key design decisions:
 *  - Progress updates are written to MongoDB incrementally (20% steps),
 *    so the frontend polling endpoint always has fresh data.
 *  - Uses atomic findOneAndUpdate to avoid race conditions when
 *    multiple webhook deliveries could arrive for the same job.
 *  - Wraps everything in try/catch so failures are captured in the
 *    job record rather than crashing the server.
 */

/**
 * Deterministic sleep utility — simulates computation time.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulates task-specific processing durations.
 * Different task types take different amounts of time (like real AI tasks).
 */
const TASK_DURATIONS = {
  photo_generation: 8000,    // 8 seconds
  video_generation: 15000,   // 15 seconds
  ad_copy: 5000,             // 5 seconds
  target_audience: 10000,    // 10 seconds
};

/**
 * Simulated output payloads — what a completed task would "return".
 */
const TASK_RESULTS = {
  photo_generation: {
    imageUrl: "https://cdn.syringe.ai/generated/photo_abc123.png",
    resolution: "1024x1024",
    model: "stable-diffusion-xl",
  },
  video_generation: {
    videoUrl: "https://cdn.syringe.ai/generated/video_xyz789.mp4",
    duration: "15s",
    fps: 30,
    model: "runway-gen3",
  },
  ad_copy: {
    headline: "Transform Your Marketing with AI-Powered Automation",
    body: "Reach your ideal audience with personalized ad creatives generated in seconds.",
    cta: "Start Free Trial",
    model: "gpt-4o",
  },
  target_audience: {
    segments: [
      { name: "Tech Enthusiasts", age: "25-34", interests: ["AI", "SaaS", "Startups"] },
      { name: "Marketing Managers", age: "30-45", interests: ["Digital Ads", "Analytics"] },
    ],
    totalReach: "2.4M",
    model: "audience-ai-v2",
  },
};

/**
 * Processes a job by simulating incremental work.
 *
 * @param {string} jobId - The unique job identifier
 * @param {string} taskType - One of the supported task types
 */
const processJob = async (jobId, taskType) => {
  try {
    // ── Step 1: Transition to PROCESSING ──────────────────────
    const job = await Job.findOneAndUpdate(
      { jobId, status: "PENDING" },
      {
        status: "PROCESSING",
        progress: 0,
        $push: {
          statusHistory: {
            status: "PROCESSING",
            timestamp: new Date(),
            message: "Webhook received — starting processing",
          },
        },
      },
      { new: true }
    );

    if (!job) {
      console.warn(`⚠️ Job ${jobId} not found or not in PENDING state. Skipping.`);
      return;
    }

    console.log(`⚙️ Processing job ${jobId} (${taskType})...`);

    // ── Step 2: Simulate incremental progress ─────────────────
    const totalDuration = TASK_DURATIONS[taskType] || 8000;
    const steps = 5; // 20%, 40%, 60%, 80%, 100%
    const stepDuration = totalDuration / steps;

    for (let i = 1; i <= steps; i++) {
      await sleep(stepDuration);
      const progress = i * 20;

      await Job.findOneAndUpdate(
        { jobId },
        {
          progress,
          $push: {
            statusHistory: {
              status: "PROCESSING",
              timestamp: new Date(),
              message: `Progress: ${progress}%`,
            },
          },
        }
      );

      console.log(`   📊 Job ${jobId}: ${progress}%`);
    }

    // ── Step 3: Transition to COMPLETED ───────────────────────
    const result = TASK_RESULTS[taskType] || { message: "Task completed successfully" };

    await Job.findOneAndUpdate(
      { jobId },
      {
        status: "COMPLETED",
        progress: 100,
        result,
        completedAt: new Date(),
        $push: {
          statusHistory: {
            status: "COMPLETED",
            timestamp: new Date(),
            message: "Processing finished successfully",
          },
        },
      }
    );

    console.log(`✅ Job ${jobId} completed successfully.`);
  } catch (error) {
    // ── Error handling: transition to FAILED ──────────────────
    console.error(`❌ Job ${jobId} failed:`, error.message);

    await Job.findOneAndUpdate(
      { jobId },
      {
        status: "FAILED",
        error: error.message,
        completedAt: new Date(),
        $push: {
          statusHistory: {
            status: "FAILED",
            timestamp: new Date(),
            message: `Processing failed: ${error.message}`,
          },
        },
      }
    );
  }
};

module.exports = { processJob };
