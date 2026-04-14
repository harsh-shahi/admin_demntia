const mongoose = require("mongoose");

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

module.exports = mongoose.model("User", userSchema);