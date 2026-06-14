require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const session = require('express-session');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'xiahbakes123';
const uploadDir = path.join(__dirname, 'uploads');
const dbDir = path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'recipes.db');

// Create folders if they do not exist yet.
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(dbDir, { recursive: true });

// Configure SQLite database connection.
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at', dbPath);
});

// Create the recipes table if it does not already exist.
db.run(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    country TEXT,
    category TEXT,
    prep_time TEXT,
    bake_time TEXT,
    difficulty TEXT,
    ingredients TEXT,
    instructions TEXT,
    image_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed the database with an example recipe if it is empty.
db.get('SELECT COUNT(*) AS count FROM recipes', (err, result) => {
  if (err) {
    console.error('Database seed check failed:', err.message);
    return;
  }
  if (result.count === 0) {
    db.run(
      `INSERT INTO recipes (title, country, category, prep_time, bake_time, difficulty, ingredients, instructions, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Sunshine Cinnamon Rolls',
        'USA',
        'Breakfast',
        '20 mins',
        '25 mins',
        'Easy',
        'Flour, Milk, Butter, Sugar, Cinnamon, Yeast, Salt',
        'Mix ingredients, roll dough, add cinnamon filling, bake until golden.',
        'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?auto=format&fit=crop&w=1200&q=80'
      ],
      (seedErr) => {
        if (seedErr) {
          console.error('Seed recipe insertion failed:', seedErr.message);
        } else {
          console.log('Seed recipe added to database.');
        }
      }
    );
  }
});

// Middleware for JSON body parsing and CORS.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'baking-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Make root HTML and public assets available to the browser.
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// API routes for recipes.
const recipeRoutes = require('./routes/recipes');
app.use('/api/recipes', recipeRoutes(db));

// Return the current conversation history stored in the user session.
app.get('/api/chat/history', (req, res) => {
  const history = req.session.chatHistory || [];
  res.json(history);
});

// Submit a new chat message and create an AI response using the OpenAI API.
app.post('/api/chat', async (req, res) => {
  const userMessage = String(req.body.message || '').trim();
  if (!userMessage) {
    return res.status(400).json({ error: 'Please send a baking question.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key is not configured. Set OPENAI_API_KEY in your environment.' });
  }

  req.session.chatHistory = req.session.chatHistory || [];

  const systemPrompt = {
    role: 'system',
    content: "You are Xiah's Baking AI, a friendly, smart, and helpful baking assistant.\n\nYour mission is to help users learn baking, improve their baking skills, discover recipes, solve baking problems, and have fun in the kitchen.\n\nPersonality: Friendly, welcoming, patient with beginners, encouraging, positive, clear, simple, professional, and fun.\n\nKnowledge areas: cakes, cookies, cupcakes, bread, brownies, donuts, pastries, frosting and decorating, ingredients and substitutions, baking techniques, kitchen tools, baking science, and baking troubleshooting.\n\nBehavior rules:\n- Always answer naturally and conversationally.\n- Give step-by-step instructions when teaching.\n- Use bullet points and numbered lists when helpful.\n- Explain baking terms in simple language.\n- Help users understand mistakes and how to fix them.\n- Suggest recipes based on ingredients users already have.\n- Recommend baking tips and best practices.\n- Encourage safe kitchen habits.\n- Never claim to be human.\n- Never invent dangerous cooking advice.\n- Always prioritize safety.\n\nRecipe requests: Provide ingredient lists, detailed instructions, baking temperature, and time when appropriate. Suggest variations and substitutions.\n\nTroubleshooting: Help with sunken cakes, dry cakes, burnt cookies, dense bread, runny frosting, overmixed batter, and undercooked centers.\n\nIf a user asks something unrelated to baking, politely answer if possible and then guide the conversation back to baking."
  };

  const recentMessages = req.session.chatHistory.slice(-8);
  const messages = [systemPrompt, ...recentMessages, { role: 'user', content: userMessage }];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.8,
      max_tokens: 350
    });

    const aiReply = completion.choices?.[0]?.message?.content?.trim() || 'I am here to help with your baking questions!';
    req.session.chatHistory.push({ role: 'user', content: userMessage });
    req.session.chatHistory.push({ role: 'assistant', content: aiReply });
    req.session.chatHistory = req.session.chatHistory.slice(-12);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Unable to reach the baking assistant right now. Please try again soon.' });
  }
});

// Simple admin login endpoint. In a beginner project, this is a demo password check.
app.post('/api/admin/login', (req, res) => {
  const password = req.body.password || '';
  if (password === ADMIN_PASSWORD) {
    return res.json({ authenticated: true, message: 'Welcome, Xiah!' });
  }
  return res.status(401).json({ authenticated: false, message: 'Password is incorrect.' });
});

// Start the web server.
app.listen(PORT, () => {
  console.log(`Xiah's Baking AI server is running on http://localhost:${PORT}`);
});
