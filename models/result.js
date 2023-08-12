const mongoose=require("mongoose")
// Connect to MongoDB using Mongoose
mongoose.connect('mongodb://127.0.0.1:27017/game', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Failed to connect to MongoDB:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true // Ensures that each username is unique
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Assuming each user should have a unique email
  },
  score: {
    type: Number,
    default: 0
  },
  signinTime: {
    type: Date, // Set the default value to the current date and time
  },
  scoreIncreasedFromPage1: {
    type: Boolean,
    default: false
  },
  scoreIncreasedFromPage2: {
    type: Boolean,
    default: false
  },
  scoreIncreasedFromPage3: {
    type: Boolean,
    default: false
  }
});


  const result_segmen_Schema = new mongoose.Schema({
    username: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    scoreIncreasedFromsegmen1: {
      type: Boolean,
      default: false
    },
    scoreIncreasedFromsegmen2: {
      type: Boolean,
      default: false
    },
    scoreIncreasedFromsegmen3: {
      type: Boolean,
      default: false
    }
  });

  const resultSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true
    },
    scores: [{
      input: {
        type: String,
        required: true
      },
      score: {
        type: Number,
        default: 0
      }
    }],
    totalScore: {
      type: Number,
      default: 0
    }
  });


  const result_compile_Schema = new mongoose.Schema({
    username: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    }
  });


  const result_input_Schema = new mongoose.Schema({
    username: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    }
  });

  
exports.User = new mongoose.model('User', userSchema);
exports.Result_s =  new mongoose.model('Result_s', result_segmen_Schema);
exports.Result = new mongoose.model('Result', resultSchema);
exports.Result_c =  new mongoose.model('Result_c', result_compile_Schema);
exports.Result_i =  new mongoose.model('Result_i', result_input_Schema);



