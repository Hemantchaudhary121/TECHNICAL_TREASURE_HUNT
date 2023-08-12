// totalScoreSchema.js
const mongoose = require('mongoose');

const totalScoreSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
});

const UsersTotalScore = mongoose.model('UsersTotalScore', totalScoreSchema);

module.exports = UsersTotalScore;
