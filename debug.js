const path = require("path");
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const session = require('express-session');
const compiler = require("compilex");
const { Result } = require('./models/result');

var options = { stats: true };
compiler.init(options);

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(session({
  secret: 'my-compiler-project',
  resave: true,
  saveUninitialized: true
}));

// Function to get the expected output based on the input
function getExpectedOutput(input) {
  const expectedOutputs = {
    '5 6': 11,
    '7 8': 15,
    '9 10': 19
    // Add more mappings as needed
  };

  if (expectedOutputs.hasOwnProperty(input)) {
    return expectedOutputs[input];
  }

  return 0;
}

function isValidUsername(username) {
  return typeof username === 'string' && username.trim() !== '';
}



router.post("/compiler", function (req, res) {
  var code = req.body.code;
  var lang = req.body.lang;
  var input = req.body.input;

  
  try {

    
    if (lang === "Cpp") {
      var envData = { OS: "windows", cmd: "g++", options: { timeout: 10000 } };

      // Get the username from the session
      var username = req.session.username;

      if (!isValidUsername(username)) {
        return res.status(400).json({ error: 'Invalid username.' });
      }

      // Get the expected output for the given input
      var expectedOutput = getExpectedOutput(input);

      // Compile the code using the compilex module
      if (!input) {
        compiler.compileCPP(envData, code, function (data) {
          if (data.output) {
            res.send(data);
          } else {
            res.send({ error: 'No output received from the compilation.' });
          }
        });
      } else {
        compiler.compileCPPWithInput(envData, code, input, function (data) {
          if (data.output) {
            // Check if the user output matches the expected output
            var userOutput = data.output.trim();
            var match = (parseInt(userOutput) === expectedOutput);

            // Find the user data in the Result collection
            Result.findOne({ username: username })
              .then((result) => {
                if (result) {
                  // Check if the input is already present in the scores array
                  var inputExists = result.scores.some((score) => score.input === input);

                  if (!inputExists && match) {
                    // Increase the score if the input doesn't exist and the output matches the expected output
                    result.scores.push({ input: input, score: 1 });
                    result.totalScore += 1; // Increment the total score
                    result.save()
                      .then(() => {
                        res.send(data);
                      })
                      .catch((error) => {
                        console.error('Error updating score:', error);
                        res.send({ error: 'An error occurred while updating the score.' });
                      });
                  } else {
                    res.send(data);
                  }
                } else {
                  // Create a new user data if it doesn't exist
                  var newResult = new Result({
                    username: username,
                    scores: [{ input: input, score: match ? 1 : 0 }],
                    totalScore: match ? 1 : 0
                  });
                  newResult.save()
                    .then(() => {
                      res.send(data);
                    })
                    .catch((error) => {
                      console.error('Error creating user data:', error);
                      res.send({ error: 'An error occurred while creating user data.' });
                    });
                }
              })
              .catch((error) => {
                console.error('Error finding user data:', error);
                res.send({ error: 'An error occurred while finding user data.' });
              });
          } else {
            res.send({ error: 'No output received from the compilation.' });
          }
        });
      }

      return; // Stop execution here after sending the response
    }
    // Handle other languages (Java, Python) as needed
    // ...
  } catch (error) {
    console.error('Error:', error);
    res.send({ error: 'An error occurred.' });
  }
});

module.exports = router;
