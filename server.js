require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ✅ UI route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/admin.html");
});

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
    email: { type: String, unique: true },
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

// 🔹 CREATE USER (SIGNUP)
app.post("/api/users", async (req, res) => {
  try {
    let { name, dob, email } = req.body;

    if (!name || !dob || !email) {
      return res.status(400).json({ message: "All fields required" });
    }

    const cleanName = name.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDob = dob.trim();

    let existingUser = await User.findOne({ "user.email": cleanEmail });

    if (existingUser) {
      return res.json({ hashId: existingUser.hashId });
    }

    const hashId = generateHash(cleanName, cleanDob, cleanEmail);

    const user = new User({
      hashId,
      user: {
        name: cleanName,
        email: cleanEmail,
        dob: cleanDob
      },
      sessions: []
    });

    await user.save();

    res.json({ hashId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 LOGIN
app.post("/api/users/login", async (req, res) => {
  try {
    let { name, dob, email } = req.body;

    if (!name || !dob || !email) {
      return res.status(400).json({ message: "All fields required" });
    }

    const cleanName = name.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDob = dob.trim();

    const hashId = generateHash(cleanName, cleanDob, cleanEmail);

    const user = await User.findOne({ hashId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Login successful", hashId });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET USER
app.get("/api/users/:hashId", async (req, res) => {
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

// 🔹 DELETE USER
app.delete("/api/users/:hashId", async (req, res) => {
  try {
    const { hashId } = req.params;

    await User.deleteOne({ hashId });

    res.json({ message: "User deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 ADD SESSION
app.post("/api/users/:hashId/sessions", async (req, res) => {
  try {
    const { hashId } = req.params;
    const { score, data } = req.body;

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

// 🔹 GET ALL SESSIONS
app.get("/api/users/:hashId/sessions", async (req, res) => {
  try {
    const { hashId } = req.params;

    const user = await User.findOne({ hashId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ sessions: user.sessions });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 ADMIN USERS
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

// 🔹 ADMIN STATS
app.get("/api/admin/stats", async (req, res) => {
  try {
    const users = await User.find();

    const totalUsers = users.length;
    const totalSessions = users.reduce(
      (acc, u) => acc + u.sessions.length,
      0
    );

    res.json({ totalUsers, totalSessions });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});