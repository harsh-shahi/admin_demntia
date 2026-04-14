require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// ================= HASH FUNCTION =================
function generateHash(name, dob, email) {
  const secret = process.env.HASH_SECRET || "default_secret";
  const str = name + dob + email + secret;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1e16;
  }

  return hash.toString(36).padStart(16, "0").slice(0, 16);
}


// ================= SCHEMA =================
const sessionSchema = new mongoose.Schema({
  sessionId: String,
  score: Number,
  createdAt: { type: Date, default: Date.now },
  data: Object
});

const userSchema = new mongoose.Schema({
  hashId: { type: String, unique: true, index: true },

  user: {
    name: String,
    email: String,
    dob: String
  },

  sessions: [sessionSchema],

  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);


// ================= DB CONNECTION =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error:", err));


// ================= ROUTES =================

// 🔹 Signup
app.post("/api/signup", async (req, res) => {
  try {
    const { name, dob, email } = req.body;

    if (!name || !dob || !email) {
      return res.status(400).json({ message: "All fields required" });
    }

    const hashId = generateHash(name, dob, email);

    let user = await User.findOne({ hashId });

    if (!user) {
      user = new User({
        hashId,
        user: { name, dob, email },
        sessions: []
      });

      await user.save();
    }

    res.json({ hashId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔹 Login (generate hash internally)
app.post("/api/login", async (req, res) => {
  try {
    const { name, dob, email } = req.body;

    if (!name || !dob || !email) {
      return res.status(400).json({ message: "All fields required" });
    }

    const hashId = generateHash(name, dob, email);

    const user = await User.findOne({ hashId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Login successful",
      hashId
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔹 Add Session
app.post("/api/add-session", async (req, res) => {
  try {
    const { hashId, score, data } = req.body;

    if (!hashId) {
      return res.status(400).json({ message: "hashId required" });
    }

    const sessionPrefix = process.env.SESSION_PREFIX || "sess_";

    const newSession = {
      sessionId: sessionPrefix + Date.now(),
      score,
      data
    };

    await User.updateOne(
      { hashId },
      { $push: { sessions: newSession } }
    );

    res.json({ message: "Session added" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 🔹 Get User Data
app.get("/api/user/:hashId", async (req, res) => {
  try {
    const { hashId } = req.params;

    const user = await User.findOne({ hashId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});

// 🔹 ADMIN: Get all users
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await User.find();

    res.json({
      count: users.length,
      users
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});