const express = require("express");
const router = express.Router();
const { handleQStashWebhook } = require("../controllers/webhookController");
const verifyQStash = require("../middleware/verifyQStash");

/**
 * Webhook Routes — receives async callbacks from QStash.
 *
 * CRITICAL: We use express.raw() here instead of express.json().
 * The QStash signature is computed over the raw request body.
 * If Express parses the JSON first, the raw bytes are lost and
 * signature verification will always fail.
 *
 * Flow: QStash → ngrok → POST /api/webhooks/qstash → verifyQStash → handleQStashWebhook
 */

router.post(
  "/qstash",
  express.raw({ type: "application/json" }),
  verifyQStash,
  handleQStashWebhook
);

module.exports = router;
