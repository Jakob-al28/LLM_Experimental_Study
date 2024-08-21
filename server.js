require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
app.use(cors());

const dbUri = process.env.DB_URI;
const openAiApiKey = process.env.OPENAPI_KEY;
const googleApiKey = process.env.GOOGLEAPI_KEY;
const googleCx = process.env.GOOGLE_CX;

mongoose.connect(dbUri) // Connect to MongoDB, insert your URI here
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });


const pageInteractionSchema = new mongoose.Schema({
  page: String,
  timeSpent: Number,
  tabbedOutCount: Number, 
  queryCount: Number, // Number of queries sent
  textBoxInputs: {
    type: Map,
    of: String
  },
  llmQueryResponses: {
    type: Object,
    of: String // Keys are LLM queries and values are LLM responses
  },
  searchQueries: {
    type: Object,
    of: String // Keys are search queries and values are clicked links
  },
  inactiveUser: Boolean
}, { timestamps: true });

const surveyResponseSchema = new mongoose.Schema({
  age: Number,
  gender: String,
  occupation: String,
  semester: String,
  education: String,
  taskTimeSufficient: Number,
  instructionsClear: Number,
  taskDifficulty: Number,
  toolsEffective: Number,
  productivityImproved: Number,
  attentionCheck: Number,
  aiToolUsage: Number,
  userFriendlyInterface: Number,
  systemInfoSufficiency: Number,
  cookie: String, 
  AIsentiment: String,
  ID: String 
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress: [String], 
  pageInteractions: [pageInteractionSchema],
  surveyResponse: [surveyResponseSchema]
}, { timestamps: true });

const Session = mongoose.model('Session', sessionSchema);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/config', (req, res) => {
  res.json({
    openAiApiKey,
    googleApiKey,
    googleCx
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/entryPage.html'));
});

// Endpoint to receive survey responses
app.post('/save-survey-response', async (req, res) => {
  const { userId, interactionData, surveyData } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(req.body);
  try {
      const newSession = new Session({
          ipAddress,
          pageInteractions: interactionData.pageInteractions,
          surveyResponse: surveyData
      });
      console.log(newSession);
      await newSession.save();
      res.status(200).send({ message: 'New session started successfully', sessionId: newSession._id });
  } catch (error) {
      console.error('Error starting new session:', error);
      res.status(500).send('Error starting new session: ' + error.message);
  }
});


// Generate unique link
app.get('/generate-link', (req, res) => {
  const uniqueId = new mongoose.Types.ObjectId();
  res.send(`http://localhost:${PORT}/experiment?userId=${uniqueId}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


const pageCountSchema = new mongoose.Schema({
  pageName: String,
  count: { type: Number, default: 0 }
});

const PageCount = mongoose.model('PageCount', pageCountSchema);

app.get('/get-random-page', async (req, res) => {
  try {
    let pages = await PageCount.find({});
    if (pages.length === 0) {
      // Initialize page counts if not present
      pages = await PageCount.insertMany([
        { pageName: 'generative_control.html', count: 0 },
        { pageName: 'generative_experimental.html', count: 0 },
        { pageName: 'retrieval_control.html', count: 0 },
        { pageName: 'retrieval_experimental.html', count: 0 }
      ]);
    }
    // Determine the page with the minimum count
    const minPage = pages.reduce((min, page) => page.count < min.count ? page : min, pages[0]);
    // Increment the count for the least served page
    await PageCount.updateOne({ _id: minPage._id }, { $inc: { count: 1 } });

    res.json({ page: minPage.pageName });
  } catch (error) {
    console.error('Error fetching random page:', error);
    res.status(500).send('Error fetching random page');
  }
});
