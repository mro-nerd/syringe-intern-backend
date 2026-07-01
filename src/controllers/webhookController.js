const { processJob } = require("../services/processingService");

/**
 * Webhook Controller — handles incoming QStash webhook deliveries.
 *
 * Flow:
 *  QStash delivers a message to POST /api/webhooks/qstash
 *    → verifyQStash middleware checks the signature (runs before this)
 *    → This controller extracts jobId & taskType from the verified payload
 *    → Kicks off the async processJob() function (fire-and-forget)
 *    → Responds with 200 OK immediately so QStash knows delivery succeeded
 *
 * Why fire-and-forget?
 *  We respond 200 to QStash right away because QStash has a delivery timeout.
 *  If we waited for the full processing (8-15s), QStash might retry,
 *  causing duplicate processing. The actual work happens in the background.
 */
const handleQStashWebhook = async (req, res) => {
  try {
    const { jobId, taskType } = req.body;

    if (!jobId || !taskType) {
      console.warn("⚠️ Webhook received with missing payload fields");
      return res.status(400).json({ error: "Missing jobId or taskType in payload" });
    }

    console.log(`🔔 Webhook received for job ${jobId} (${taskType})`);

    // Fire-and-forget: start processing without awaiting
    // This ensures we respond to QStash within its timeout window
    processJob(jobId, taskType).catch((err) => {
      console.error(`❌ Background processing error for job ${jobId}:`, err.message);
    });

    // Respond immediately — QStash considers this a successful delivery
    return res.status(200).json({
      success: true,
      message: `Job ${jobId} processing started`,
    });
  } catch (error) {
    console.error("❌ Webhook handler error:", error.message);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

module.exports = { handleQStashWebhook };
