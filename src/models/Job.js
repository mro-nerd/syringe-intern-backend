const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

/**
 * Job Schema — tracks the full lifecycle of an async processing task.
 *
 * Design rationale:
 *  - jobId:        A UUID that serves as the unique internal identifier (not _id)
 *                  so we have a portable, human-readable reference.
 *  - qstashMessageId: Maps directly to the QStash message ID returned when we
 *                  publish to the queue. This lets us correlate incoming webhooks.
 *  - status:       Enum capturing the explicit state machine:
 *                  PENDING → PROCESSING → COMPLETED | FAILED
 *  - progress:     0-100 integer for granular progress tracking during PROCESSING.
 *  - result:       Flexible Mixed field to hold any output payload on completion.
 *  - error:        Captures failure reason when status moves to FAILED.
 *  - statusHistory: An append-only log of every state transition with timestamps,
 *                  crucial for debugging and auditing in production.
 *  - timestamps:   createdAt (record initiated), updatedAt (last modified),
 *                  completedAt (when the task reached a terminal state).
 */
const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      index: true,
    },
    qstashMessageId: {
      type: String,
      default: null,
      index: true,
    },
    taskType: {
      type: String,
      enum: ["photo_generation", "video_generation", "ad_copy", "target_audience"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        message: { type: String, default: "" },
      },
    ],
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Auto-generates createdAt & updatedAt
  }
);

/**
 * Pre-save hook: automatically appends a status-history entry
 * whenever the status field is modified, keeping an immutable audit trail.
 */
jobSchema.pre("save", function () {
  if (this.isModified("status")) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      message: `Status changed to ${this.status}`,
    });
  }
});

module.exports = mongoose.model("Job", jobSchema);
