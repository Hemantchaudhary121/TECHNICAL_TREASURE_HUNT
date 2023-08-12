const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const compiler = require("compilex");
const routes = require('./routes');
const UsersTotalScore = require('./models/totalScore');
const { Result, Result_i, Result_c, Result_s, User } = require('./models/result')

const app = express();

// Configure session middleware
app.use(session({
  secret: 'my-compiler-project',
  resave: true,
  saveUninitialized: true
}));

// Configure body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/codemirror-5.65.13", express.static(path.join(__dirname, 'codemirror-5.65.13')));

const compileroute = require("./compiler");
const debugroute = require("./debug");
const inputroute = require("./input");

app.use("/compiler", compileroute);
app.use("/debug", debugroute);
app.use("/input", inputroute);

// Set the views directory
app.set('views', path.join(__dirname, 'views'));

// Set EJS as the view engine
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));



// Connect to the MongoDB database
mongoose.connect("mongodb://127.0.0.1:27017/game", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Home Route
app.get('/', (req, res) => {
  if (req.session.username) {
    User.findOne({ username: req.session.username })
      .then((user) => {
        res.render('home', { username: req.session.username, score: user.score });
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        res.redirect('/signup');
      });
  } else {
    res.redirect('/signup');
  }
});


// Login Route
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  User.findOne({ username: username })
    .then((user) => {
      if (!user) {
        res.render('login', { error: 'Invalid username or password' });
      } else {
        bcrypt.compare(password, user.password)
          .then((match) => {
            if (match) {
              req.session.username = user.username;
              res.redirect('/');
            } else {
              res.render('login', { error: 'Invalid username or password' });
            }
          })
          .catch((err) => {
            console.error(err);
            res.render('login', { error: 'An error occurred' });
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.render('login', { error: 'An error occurred' });
    });
});


// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
    }
    res.redirect('/signup');
  });
});

// Signup Route
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});


app.post('/signup', async (req, res) => {
  const { email,username, password } = req.body;

  try {
    // Validate the username before proceeding
   

    // Check if the username already exists in the users collection
    const existingUser = await User.findOne({ username }).exec();
    if (existingUser) {
      return res.render('signup', { error: 'Username already exists' });
    }

    // Generate a salt for bcrypt password hashing
    const salt = await bcrypt.genSalt(10);

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, salt);

    // Get the current date and time in the Indian time zone (IST)
    const nowIST = moment().tz('Asia/Kolkata');
    const signupTimeIST = nowIST.toDate();
    // Create a new user document in the users collection
    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      score: 0, // Initialize the score to 0 for a new user
      signinTime:signupTimeIST,
    });

    // Save the new user document
    await newUser.save();

    // Create a new result document in the results collection
    const newResult = new Result({
      username,
      scores: [], // Initialize the scores array as empty for a new user
      totalScore: 0, // Initialize the total score to 0 for a new user
    });

    // Save the new result document
    await newResult.save();

    // Create a new result_c document in the result_c collection
    const newResultC = new Result_c({
      username,
      score: 0, // Set the initial score to 0 or any desired value
    });

    // Save the new result_c document
    await newResultC.save();

    // Create a new result_s document in the result_s collection
    const newResultS = new Result_s({
      username,
      score: 0, // Set the initial score to 0 or any desired value
    });

    // Save the new result_s document
    await newResultS.save();

    // Create a new result_i document in the result_i collection
    const newResultI = new Result_i({
      username,
      score: 0, // Set the initial score to 0 or any desired value
    });

    // Save the new result_i document
    await newResultI.save();

    // Create a new UsersTotalScore document for the new user with an initial total score of 0
    const newUsersTotalScore = new UsersTotalScore({
      username,
      totalScore: 0,
    });

    // Save the new UsersTotalScore document
    await newUsersTotalScore.save();

    // Redirect the user to the home page after successful signup
    req.session.username = username;
    res.redirect('/');
  } catch (error) {
    console.error('Error during signup:', error);
    res.render('signup', { error: 'An error occurred' });
  }
});


// Middleware to check user authentication and session
const requireLogin = (req, res, next) => {
  if (req.session.username) {
    // User is logged in, proceed to the next middleware or route handler
    next();
  } else {
    // User is not logged in, redirect to the login page
    res.redirect('/login'); // Adjust the URL for your login page
  }
};

// Middleware to check user progress and set session variables
const checkUserProgress = (req, res, next) => {
  if (req.session.username) {
    User.findOne({ username: req.session.username })
      .then((user) => {
        req.session.score = user.score;
        req.session.page1ScoreIncreased = user.scoreIncreasedFromPage1;
        req.session.page2ScoreIncreased = user.scoreIncreasedFromPage2;
        req.session.page3ScoreIncreased = user.scoreIncreasedFromPage3;
        next();
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('An error occurred');
      });
  } else {
    res.redirect('/login');
  }
};

// Route for tle1 (with authentication and user progress check middleware)
app.get('/tle/1', requireLogin, checkUserProgress, (req, res) => {
  if (!req.session.page1ScoreIncreased) {
    // User has not completed tle1, render tle1.ejs with the user's score
    res.render('tle1', { score: req.session.score });
  } else {
    // User has completed tle1, redirect to tle2
    res.redirect('/tle/2');
  }
});


// Route for tle2 (with authentication and user progress check middleware)
app.get('/tle/2', requireLogin, checkUserProgress, (req, res) => {
  if (req.session.page1ScoreIncreased && !req.session.page2ScoreIncreased) {
    // User has completed tle1 but not tle2, render tle2.ejs with the user's score
    res.render('tle2', { score: req.session.score });
  } else {
    // User has not completed tle1 or has completed tle2, redirect accordingly
    if (!req.session.page1ScoreIncreased) {
      res.redirect('/tle/1');
    } else {
      // Redirect to the next page after tle2 (e.g., tle3)
      res.redirect('/tle/3'); // Adjust the URL for tle3
    }
  }
});

// Route for tle3 (with authentication and user progress check middleware)
app.get('/tle/3', requireLogin, checkUserProgress, (req, res) => {
  if (req.session.page1ScoreIncreased && req.session.page2ScoreIncreased && !req.session.page3ScoreIncreased) {
    // User has completed tle1 and tle2 but not tle3, render tle3.ejs with the user's score
    res.render('tle3', { score: req.session.score });
  } else {
    // User has not completed tle1, tle2, or has completed tle3, redirect accordingly
    if (!req.session.page1ScoreIncreased) {
      res.redirect('/tle/1');
    } else if (!req.session.page2ScoreIncreased) {
      res.redirect('/tle/2');
    } else {
      // Redirect to the completion page or dashboard when all pages are completed
      res.redirect('/tle/4'); // Adjust the URL for the completion page or dashboard
    }
  }
});

app.get('/tle/4',(req,res)=>{
  res.render('tle4');
})


// Answer Submission Route
app.post('/submit-answer', (req, res) => {
  console.log('Session:', req.session);
  if (req.session.username) {
    const currentPage = parseInt(req.body.page);

    // Validate current page number
    if (isNaN(currentPage) || currentPage < 1 || currentPage > 3) {
      return res.redirect('/login'); // Redirect to the login page or any other appropriate page for invalid input
    }

    const action = req.body.action;
    if (action === 'increase') {
      // Logic for handling correct answers
      User.findOne({ username: req.session.username })
        .then((user) => {
          if (user) {
            if (!user[`scoreIncreasedFromPage${currentPage}`]) {
              user.score += 1;
              user[`scoreIncreasedFromPage${currentPage}`] = true;
              user.save()
                .then(() => {
                  req.session.score = user.score;

                  // Update session variables based on the current page
                  switch (currentPage) {
                    case 1:
                      req.session.page1ScoreIncreased = true;
                      break;
                    case 2:
                      req.session.page2ScoreIncreased = true;
                      break;
                    case 3:
                      req.session.page3ScoreIncreased = true;
                      break;
                  }

                  res.redirect(`/tle/${currentPage + 1}`); // Redirect to the next page
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).send('An error occurred');
                });
            } else {
              // User has already completed this page, redirect back to the current page
              res.redirect(`/tle/${currentPage}`);
            }
          } else {
            res.status(404).send('User not found');
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('An error occurred');
        });
    } else if (action === 'decrease') {
      // Logic for handling incorrect answers
      User.findOne({ username: req.session.username })
        .then((user) => {
          if (user) {
            user.score -= 1;
            user.save()
              .then(() => {
                req.session.score = user.score;
                res.redirect(`/tle/${currentPage}`); // Redirect back to the current page
              })
              .catch((err) => {
                console.error(err);
                res.status(500).send('An error occurred');
              });
          } else {
            res.status(404).send('User not found');
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('An error occurred');
        });
    } else {
      // Invalid action, redirect back to the current page
      res.redirect(`/tle/${currentPage}`);
    }
  } else {
    res.redirect('/login');
  }
});





  //compiler route
  app.get('/password_compiler', (req, res) => {
    const username = req.session.username;
  
    // Check if username exists in the session
    if (username) {
      res.render('password_compiler');
    } else {
      res.redirect('/login'); // Redirect to the login page or any other desired route
    }
  });
  

  //compiler request
  app.post('/password_compiler', (req, res) => {
    const enteredPassword = req.body.password;
    const correctPassword = '56789'; // Replace with your actual correct password
    const username = req.session.username;
  
    if (enteredPassword === correctPassword && username) {
      res.redirect('/compiler');
    } else {
      res.redirect('/password_compiler');
    }
  });

  app.get('/compiler', (req, res) => {
    // Check if the request is coming from a valid source
    if (!req.headers.referer || !req.headers.referer.includes('/password_compiler')) {
      return res.redirect('/password_compiler');
    }
    compiler.flush(function () {
      console.log("deleted");
    });
  
    // Any necessary data can be passed to the compiler.ejs template
    res.render('compiler');
  });

  //debug route
  app.get('/password_debug', (req, res) => {
    const username = req.session.username;
  
    // Check if username exists in the session
    if (username) {
      res.render('password_debug');
    } else {
      res.redirect('/login'); // Redirect to the login page or any other desired route
    }
  });
  

  //compiler request
  app.post('/password_debug', (req, res) => {
    const enteredPassword = req.body.password;
    const correctPassword = '56789'; // Replace with your actual correct password
    const username = req.session.username;
  
    if (enteredPassword === correctPassword && username) {
      res.redirect('/debug');
    } else {
      res.redirect('/password_debug');
    }
  });

  app.get('/debug', async (req, res) => {
    // Check if the request is coming from a valid source
    if (!req.headers.referer || !req.headers.referer.includes('/password_debug')) {
      return res.redirect('/password_debug');
    }
  
    try {
      // Get the username from the session
      const username = req.session.username;
  
      if (!username) {
        return res.redirect('/password_debug');
      }
  
      // Fetch the 'totalScore' value from the database for the current user
      const result = await Result.findOne({ username });
  
      if (result) {
        const totalScore = result.totalScore;
  
        // Render the 'compiler.ejs' template and pass the 'totalScore' value to it.
        res.render('debug', { totalScore });
      } else {
        // Handle the case when the user data is not found in the Result collection
        // You may choose to set 'totalScore' to zero or display an error message.
        res.render('debug', { totalScore: 0 });
      }
    } catch (error) {
      console.error('Error:', error);
      // Handle any errors and send an error response if needed.
      res.status(500).send('An error occurred while fetching data.');
    }
  });

    

  //input route
  app.get('/password_input', (req, res) => {
    const username = req.session.username;
  
    // Check if username exists in the session
    if (username) {
      res.render('password_input');
    } else {
      res.redirect('/login'); // Redirect to the login page or any other desired route
    }
  });
  

  //compiler request
  app.post('/password_input', (req, res) => {
    const enteredPassword = req.body.password;
    const correctPassword = '56789'; // Replace with your actual correct password
    const username = req.session.username;
  
    if (enteredPassword === correctPassword && username) {
      res.redirect('/input');
    } else {
      res.redirect('/password_input');
    }
  });

  app.get('/input', (req, res) => {
    // Check if the request is coming from a valid source
    if (!req.headers.referer || !req.headers.referer.includes('/password_input')) {
      return res.redirect('/password_input');
    }

    compiler.flush(function () {
      console.log("deleted");
    });
  
    // Any necessary data can be passed to the compiler.ejs template
    res.render('input');
  });


  const checkUserProgress_segmen = (req, res, next) => {
    if (req.session.username) {
      Result_s.findOne({ username: req.session.username })
        .then((user) => {
          req.session.score = user.score;
          req.session.segmen1ScoreIncreased = user.scoreIncreasedFromsegmen1;
          req.session.segmen2ScoreIncreased = user.scoreIncreasedFromsegmen2;
          req.session.segmen3ScoreIncreased = user.scoreIncreasedFromsegmen3;
          next();
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('An error occurred');
        });
    } else {
      res.redirect('/login');
    }
  };

  

  app.get('/segmen/1', requireLogin, checkUserProgress_segmen, (req, res) => {
    if (!req.session.segmen1ScoreIncreased) {
      // User has not completed tle1, render tle1.ejs with the user's score
      res.render('segmen1', { score: req.session.score });
    } else {
      // User has completed tle1, redirect to tle2
      res.redirect('/segmen/2');
    }
  });
  
  
  // Route for tle2 (with authentication and user progress check middleware)
  app.get('/segmen/2', requireLogin, checkUserProgress_segmen, (req, res) => {
    if (req.session.segmen1ScoreIncreased && !req.session.segmen2ScoreIncreased) {
      // User has completed tle1 but not tle2, render tle2.ejs with the user's score
      res.render('segmen2', { score: req.session.score });
    } else {
      // User has not completed tle1 or has completed tle2, redirect accordingly
      if (!req.session.segmen1ScoreIncreased) {
        res.redirect('/segmen/1');
      } else {
        // Redirect to the next page after tle2 (e.g., tle3)
        res.redirect('/segmen/3'); // Adjust the URL for tle3
      }
    }
  });
  
  // Route for tle3 (with authentication and user progress check middleware)
  app.get('/segmen/3', requireLogin, checkUserProgress_segmen, (req, res) => {
    if (req.session.segmen1ScoreIncreased && req.session.segmen2ScoreIncreased && !req.session.segmen3ScoreIncreased) {
      // User has completed tle1 and tle2 but not tle3, render tle3.ejs with the user's score
      res.render('segmen3', { score: req.session.score });
    } else {
      // User has not completed tle1, tle2, or has completed tle3, redirect accordingly
      if (!req.session.segmen1ScoreIncreased) {
        res.redirect('/segmen/1');
      } else if (!req.session.segmen2ScoreIncreased) {
        res.redirect('/segmen/2');
      } else {
        // Redirect to the completion page or dashboard when all pages are completed
        res.redirect('/segmen/4'); // Adjust the URL for the completion page or dashboard
      }
    }
  });
 

  app.get('/segmen/4',(req,res)=>{
    res.render('segmen4');
  })

  // Answer Submission Route
app.post('/submit-answer-segmen', (req, res) => {
  console.log('Session:', req.session);
  if (req.session.username) {
    const currentPage = parseInt(req.body.page);

    // Validate current page number
    if (isNaN(currentPage) || currentPage < 1 || currentPage > 3) {
      return res.redirect('/login'); // Redirect to the login page or any other appropriate page for invalid input
    }

    const action = req.body.action;
    if (action === 'increase') {
      // Logic for handling correct answers
      Result_s.findOne({ username: req.session.username })
        .then((user) => {
          if (user) {
            if (!user[`scoreIncreasedFromsegmen${currentPage}`]) {
              user.score += 1;
              user[`scoreIncreasedFromsegmen${currentPage}`] = true;
              user.save()
                .then(() => {
                  req.session.score = user.score;

                  // Update session variables based on the current page
                  switch (currentPage) {
                    case 1:
                      req.session.segmen1ScoreIncreased = true;
                      break;
                    case 2:
                      req.session.segmen2ScoreIncreased = true;
                      break;
                    case 3:
                      req.session.segmen3ScoreIncreased = true;
                      break;
                  }

                  res.redirect(`/segmen/${currentPage + 1}`); // Redirect to the next page
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).send('An error occurred');
                });
            } else {
              // User has already completed this page, redirect back to the current page
              res.redirect(`/segmen/${currentPage}`);
            }
          } else {
            res.status(404).send('User not found');
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('An error occurred');
        });
    } else if (action === 'decrease') {
      // Logic for handling incorrect answers
      Result_s.findOne({ username: req.session.username })
        .then((user) => {
          if (user) {
            user.score -= 1;
            user.save()
              .then(() => {
                req.session.score = user.score;
                res.redirect(`/segmen/${currentPage}`); // Redirect back to the current page
              })
              .catch((err) => {
                console.error(err);
                res.status(500).send('An error occurred');
              });
          } else {
            res.status(404).send('User not found');
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('An error occurred');
        });
    } else {
      // Invalid action, redirect back to the current page
      res.redirect(`/segmen/${currentPage}`);
    }
  } else {
    res.redirect('/login');
  }
});


app.use('/', routes);
  
module.exports=app;
