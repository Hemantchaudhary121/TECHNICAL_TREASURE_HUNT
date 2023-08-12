const path = require("path");
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const session = require('express-session');
const ejs = require("ejs");
const compiler = require("compilex");
const { Result, Result_i, Result_c, Result_s, User }= require('./models/result');

var options = { stats: true }; //prints stats on console 
compiler.init(options);

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(session({
  secret: 'my-compiler-project',
  resave: true,
  saveUninitialized: true
}));

function increaseScore(username) {
    return Result_i.findOneAndUpdate(
      { username: username, score: 0 },
      { $set: { score: 1 } },
      { new: true }
    ).exec();
  }
  
  router.post("/compiler", function (req, res) {
    var code = req.body.code;
    var lang = req.body.lang;
    var session = req.session;
  
    try {
      if (lang === "Cpp") {
        var input = "5 6";
        var envData = { OS: "windows", cmd: "g++", options: { timeout: 10000 } };
  
        compiler.compileCPPWithInput(envData, code, input, function (data) {
          if (data.output) {
            var correctOutput = "11";
            var isCorrect = data.output.trim() === correctOutput.trim();
  
            if (isCorrect) {
              var username = session.username; // Extract username from session
  
              if (!username) {
                console.error("Username is null");
                res.send({ output: "error" });
                return;
              }
  
              Result_i.findOneAndUpdate(
                { username: username },
                { $setOnInsert: { username: username, score: 1 } },
                { upsert: true, new: true }
              )
                .then((result) => {
                  if (result) {
                    if (result.score === 0) {
                      increaseScore(username)
                        .then((updatedResult) => {
                          if (updatedResult) {
                            res.send({ output: "go to library" });
                          } else {
                            console.error("Error updating score");
                            res.send({ output: "error" });
                          }
                        })
                        .catch((error) => {
                          console.error("Error increasing score:", error);
                          res.send({ output: "error" });
                        });
                    } else {
                      console.error("Score already updated");
                      res.send({ output: "go to library" });
                    }
                  }
                })
                .catch((error) => {
                  console.error("Error finding or creating user:", error);
                  res.send({ output: "error" });
                });
            } else {
              res.send(data);
            }
          } else {
            res.send(data);
          }
        });
      }
      // Add similar logic for other languages if needed
    } catch (error) {
      console.error("Error:", error);
      res.send({ output: "error" });
    }
  });
  




module.exports = router;
