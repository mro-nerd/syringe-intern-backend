const { Receiver } = require("@upstash/qstash");

/**
 * QStash Signature Verification Middleware
 *
 * Why this exists:
 *  Your webhook endpoint is publicly accessible (via ngrok).
 *  Anyone who discovers the URL could send fake requests to trigger
 *  job processing. QStash signs every request with HMAC, and this
 *  middleware verifies that signature using your signing keys.
 *
 * How it works:
 *  1. QStash sends an `Upstash-Signature` header with each webhook.
 *  2. We use the @upstash/qstash Receiver to verify the signature
 *     against both the current and next signing keys (key rotation support).
 *  3. If verification fails → 401 Unauthorized.
 *  4. If it passes → the parsed body is attached to req.body and we proceed.
 *
 * IMPORTANT: Express must NOT parse the body before this middleware runs,
 * because the signature is computed over the raw body string. That's why
 * the webhook route uses express.raw() instead of express.json().
 */

let receiver = null;

const getReceiver = () => {
  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    });
  }
  return receiver;
};

const verifyQStash = async (req, res, next) => {
  try {
    const signature = req.headers["upstash-signature"];

    if (!signature) {
      console.warn("⚠️ Webhook request missing Upstash-Signature header");
      return res.status(401).json({ error: "Missing signature" });
    }

    // req.body is a raw Buffer because we use express.raw() on this route
    const rawBody = req.body.toString("utf-8");

    const recv = getReceiver();
    const isValid = await recv.verify({
      signature,
      body: rawBody,
    });

    if (!isValid) {
      console.warn("⚠️ Invalid QStash signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse the verified raw body into JSON and replace req.body
    req.body = JSON.parse(rawBody);
    next();
  } catch (error) {
    console.error("❌ QStash signature verification failed:", error.message);
    return res.status(401).json({ error: "Signature verification failed" });
  }
};

module.exports = verifyQStash;
