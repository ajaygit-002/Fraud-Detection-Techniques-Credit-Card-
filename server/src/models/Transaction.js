const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    cardId: { type: String, required: true },
    amount: { type: Number, required: true },
    location: { type: String, default: "" },
    merchant: { type: String, required: true },
    hour: { type: Number, min: 0, max: 23, required: true },
    international: { type: Boolean, default: false },
    fraud: { type: Boolean, required: true },
    confidence: { type: Number, required: true },
    riskScore: { type: String, enum: ["low", "medium", "high"], required: true },
    reasons: { type: [String], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
