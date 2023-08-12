// routes.js
const express = require('express');
const session = require('express-session');
const { Result, Result_i, Result_c, Result_s, User } = require('./models/result');
const UsersTotalScore = require('./models/totalScore'); // Import the UsersTotalScore model

const router = express.Router();

// Function to update the totalScore
router.use(session({
    secret: 'your-secret-key', // Replace with your own secret key, same as app.js
    resave: false,
    saveUninitialized: false,
  }));
  
  // Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.username) {
      // User is authenticated, proceed to the next middleware or route handler
      next();
    } else {
      // User is not authenticated, redirect to the login page
      res.redirect('/login');
    }
  };
  
  // Home route
  router.get('/api/leaderboard', async (req, res) => {
    try {
      // Fetch the top 10 leaderboard data from the Result collection
      const leaderboard = await UsersTotalScore.find().sort({ totalScore: -1 }).limit(10);
      res.json(leaderboard);
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      res.status(500).json({ success: false, message: 'Error fetching leaderboard data' });
    }
  });

  router.post('/update_total_score', isAuthenticated, async (req, res) => {
    try {
      // Fetch all users from the User collection
      const users = await User.find();
      
      // Iterate through each user and update their total score in the UsersTotalScore collection
      for (const user of users) {
        const { username } = user;
        
        // Fetch scores from all 5 collections for the current user
        const [userScore, resultSegmenScore, resultScore, resultCompileScore, resultInputScore] = await Promise.all([
          User.findOne({ username }).select('score'),
          Result_i.findOne({ username }).select('score'),
          Result.findOne({ username }).select('totalScore'),
          Result_c.findOne({ username }).select('score'),
          Result_s.findOne({ username }).select('score')
        ]);
  
        // Calculate the total score for the current user
        const totalScore = userScore.score + resultSegmenScore.score + resultScore.totalScore + resultCompileScore.score + resultInputScore.score;
  
        // Update the total score in the UsersTotalScore collection for the current user
        await UsersTotalScore.findOneAndUpdate({ username }, { totalScore });
      }
  
      res.json({ success: true, message: 'Total scores updated successfully!' });
    } catch (err) {
      console.error('Error updating total scores:', err);
      res.status(500).json({ success: false, message: 'Error updating total scores' });
    }
  });
  
  
  

  router.get('/home', isAuthenticated, (req, res) => {
    const { username } = req.session.username;
    res.render('home', { username });
  });
  
  module.exports = router;