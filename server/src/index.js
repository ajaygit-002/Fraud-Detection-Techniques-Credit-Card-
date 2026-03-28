const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Transaction = require("./models/Transaction");
const User = require("./models/User");
const { protect, admin } = require("./middleware/auth");

const app = express();
const port = Number(process.env.PORT || 5000);
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/fraud_detection";
const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
const jwtSecret = process.env.JWT_SECRET || "supersecretkey";

const rulesFilePath = path.join(__dirname, "../../rules.json");

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error.message));

// Generate JWT Helper
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, jwtSecret, { expiresIn: "30d" });
};

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      username,
      password,
      role: role || "analyst"
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id, user.role)
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id, user.role)
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", details: error.message });
  }
});

// --- GET HEALTH ---
app.get("/api/health", async (_req, res) => {
  let mlStatus = "unreachable";
  try {
    const response = await axios.get(`${mlServiceUrl}/health`, { timeout: 1500 });
    mlStatus = response.data.status || "ok";
  } catch (_error) {
    mlStatus = "unreachable";
  }
  return res.json({ status: "ok", mlService: mlStatus });
});

// --- RULES API ---
app.get("/api/rules", protect, (req, res) => {
  try {
    if (!fs.existsSync(rulesFilePath)) {
       return res.status(404).json({ message: "Rules file not found" });
    }
    const rulesConfig = fs.readFileSync(rulesFilePath, "utf8");
    res.json(JSON.parse(rulesConfig));
  } catch (error) {
    res.status(500).json({ message: "Failed to read rules file", details: error.message });
  }
});

app.post("/api/rules/update", protect, admin, (req, res) => {
  try {
    const newRules = req.body;
    fs.writeFileSync(rulesFilePath, JSON.stringify(newRules, null, 2));
    res.json({ message: "Rules updated successfully", rules: newRules });
  } catch (error) {
    res.status(500).json({ message: "Failed to update rules", details: error.message });
  }
});

// --- TRANSACTIONS & ANALYZE ---
app.post("/api/transaction/analyze", async (req, res) => {
  try {
    const { cardId, amount, location, merchant, hour, international } = req.body;

    if (!cardId || amount === undefined || !merchant || hour === undefined) {
      return res.status(400).json({ message: "cardId, amount, merchant, and hour are required" });
    }

    // 1. Rule-based evaluation
    let ruleFlagged = false;
    let ruleReasons = [];
    try {
      if (fs.existsSync(rulesFilePath)) {
         const rulesConfig = JSON.parse(fs.readFileSync(rulesFilePath, "utf8"));
         if (amount > (rulesConfig.amount_threshold || 5000)) {
           ruleFlagged = true;
           ruleReasons.push(`Amount exceeds threshold of $${rulesConfig.amount_threshold || 5000}`);
         }
         // Custom logic for night hours
         if (hour >= 0 && hour <= 5) {
           ruleFlagged = true;
           ruleReasons.push("Night transaction (0AM - 5AM)");
         }
      }
    } catch (e) {
      console.error("Rules parsing error:", e.message);
    }

    // 2. ML Prediction Call
    let mlFlagged = false;
    let mlConfidence = 0.0;
    try {
      const predictionResponse = await axios.post(
        `${mlServiceUrl}/predict`,
        { amount, merchant, hour, location, international: Boolean(international) },
        { timeout: 5000 }
      );
      const prediction = predictionResponse.data;
      mlFlagged = prediction.fraud;
      mlConfidence = prediction.confidence || 0.0;
    } catch (error) {
      console.warn("ML Service unavailable or failed:", error.message);
    }

    // 3. Risk scoring decision
    let finalFraud = false;
    let riskScore = "low";

    if (ruleFlagged && mlFlagged) {
      riskScore = "high";
      finalFraud = true;
    } else if (ruleFlagged || mlFlagged) {
      riskScore = "medium";
      finalFraud = mlFlagged; // Treat ML prediction as true status but medium risk
    } else {
      riskScore = "low";
      finalFraud = false;
    }

    // Combine reasons
    const reasons = ruleReasons.concat(mlFlagged ? ["ML identified fraudulent behavior patterns"] : []);

    const saved = await Transaction.create({
      cardId,
      amount,
      location: location || "",
      merchant,
      hour,
      international: Boolean(international),
      fraud: finalFraud,
      confidence: mlConfidence,
      riskScore,
      reasons
    });

    return res.status(201).json({
      id: saved._id,
      riskScore,
      fraud: finalFraud,
      confidence: mlConfidence,
      reasons,
      transaction: saved
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", details: error.message });
  }
});

app.get("/api/transactions", protect, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const rows = await Transaction.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch transactions", details: error.message });
  }
});

app.get("/api/alerts", protect, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const rows = await Transaction.find({ riskScore: { $in: ["medium", "high"] } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch alerts", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
