const { Client } = require("@upstash/qstash");

/**
 * QStash Service — encapsulates all interactions with the Upstash QStash API.
 *
 * How it works:
 *  1. When a job is created, we call publishJob() which sends a message to QStash.
 *  2. QStash stores the message and asynchronously delivers it back to our
 *     webhook endpoint (the ngrok URL + /api/webhooks/qstash).
 *  3. QStash includes a signature header so we can verify authenticity.
 *
 * The "destination" URL is our own webhook — QStash acts as a reliable
 * message broker that guarantees at-least-once delivery with retries.
 */

let qstashClient = null;

/**
 * Lazy-initialise the QStash client so the module can be required
 * before dotenv has loaded (useful for testing).
 */
const getClient = () => {
  if (!qstashClient) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN,
    });
  }
  return qstashClient;
};

/**
 * Publishes a job payload to QStash.
 *
 * @param {Object} jobData - Must contain at least { jobId, taskType }
 * @returns {Object} QStash response including the messageId
 */
const publishJob = async (jobData) => {
  const client = getClient();

  // The destination is our own webhook endpoint exposed via ngrok
  const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/qstash`;

  const response = await client.publishJSON({
    url: webhookUrl,
    body: {
      jobId: jobData.jobId,
      taskType: jobData.taskType,
    },
    retries: 3, // QStash will retry up to 3 times on failure
  });

  console.log(`📤 Published job ${jobData.jobId} to QStash → messageId: ${response.messageId}`);
  return response;
};

module.exports = { publishJob };
