require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const PORT = process.env.PORT || 3000;
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

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (userTableErr) => {
    if (userTableErr) {
      console.error('User table creation failed:', userTableErr.message);
    }
  });

  // Create the recipes table if it does not already exist.
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      country TEXT,
      category TEXT,
      prep_time TEXT,
      bake_time TEXT,
      cooking_time TEXT,
      difficulty TEXT,
      ingredients TEXT,
      instructions TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (createErr) => {
    if (createErr) {
      console.error('Recipe table creation failed:', createErr.message);
      return;
    }

    const ensureSchemaColumns = () => {
      db.all('PRAGMA table_info(recipes)', (pragmaErr, columns) => {
        if (pragmaErr) {
          console.error('Unable to inspect recipe schema:', pragmaErr.message);
          return seedRecipeIfEmpty();
        }

        const existingColumns = new Set(columns.map((column) => column.name));
        const alterStatements = [];

        if (!existingColumns.has('description')) {
          alterStatements.push('ALTER TABLE recipes ADD COLUMN description TEXT');
        }

        if (!existingColumns.has('cooking_time')) {
          alterStatements.push('ALTER TABLE recipes ADD COLUMN cooking_time TEXT');
        }

        const runNextAlter = () => {
          const sql = alterStatements.shift();
          if (!sql) {
            return seedRecipeIfEmpty();
          }

          db.run(sql, (alterErr) => {
            if (alterErr) {
              console.error('Schema migration failed:', alterErr.message);
            }
            runNextAlter();
          });
        };

        runNextAlter();
      });
    };

    const seedRecipeIfEmpty = () => {
      // Seed the database with an example recipe if it is empty.
      db.get('SELECT COUNT(*) AS count FROM recipes', (err, result) => {
        if (err) {
          console.error('Database seed check failed:', err.message);
          return;
        }
        if (result.count === 0) {
          db.run(
            `INSERT INTO recipes (title, description, country, category, prep_time, bake_time, cooking_time, difficulty, ingredients, instructions, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'Sunshine Cinnamon Rolls',
              'Fluffy cinnamon rolls with a soft center and sweet glaze.',
              'USA',
              'Breakfast',
              '20 mins',
              '25 mins',
              '45 mins',
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
    };

    ensureSchemaColumns();
  });
});

// Middleware for JSON body parsing and CORS.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'baking-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required.' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Admin authorization required.' });
}

const publicPages = new Set(['/login.html', '/signup.html']);
const adminPages = new Set(['/recipe-management.html', '/admin.html']);

app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/index.html');
  }
  return res.redirect('/login.html');
});

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const requestPath = req.path.toLowerCase();

  if (!requestPath.endsWith('.html')) {
    return next();
  }

  if (publicPages.has(requestPath)) {
    if (req.session && req.session.user) {
      return res.redirect('/index.html');
    }
    return next();
  }

  if (!(req.session && req.session.user)) {
    return res.redirect('/login.html');
  }

  if (adminPages.has(requestPath) && !req.session.user.isAdmin) {
    return res.redirect('/index.html');
  }

  return next();
});

// Make HTML, assets, and uploads available to the browser.
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// API routes.
const recipeRoutes = require('./routes/recipes');
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes(db));
app.use('/api/recipes', recipeRoutes(db, { requireAuth, requireAdmin }));

// Return the current conversation history stored in the user session.
app.get('/api/chat/history', requireAuth, (req, res) => {
  const history = req.session.chatHistory || [];
  res.json(history);
});

// Submit a new chat message and create an AI response using the Ollama API.
app.post('/api/chat', requireAuth, async (req, res) => {
  const userMessage = String(req.body.message || '').trim();
  if (!userMessage) {
    return res.status(400).json({ error: 'Please send a baking question.' });
  }

  req.session.chatHistory = req.session.chatHistory || [];

  const systemPrompt = "You are Xiah's Baking AI, a friendly, smart, and helpful baking assistant.\n\nYour mission is to help users learn baking, improve their baking skills, discover recipes, solve baking problems, and have fun in the kitchen.\n\nPersonality: Friendly, welcoming, patient with beginners, encouraging, positive, clear, simple, professional, and fun.\n\nKnowledge areas: cakes, cookies, cupcakes, bread, brownies, donuts, pastries, frosting and decorating, ingredients and substitutions, baking techniques, kitchen tools, baking science, and baking troubleshooting.\n\nBehavior rules:\n- Always answer naturally and conversationally.\n- Give step-by-step instructions when teaching.\n- Use bullet points and numbered lists when helpful.\n- Explain baking terms in simple language.\n- Help users understand mistakes and how to fix them.\n- Suggest recipes based on ingredients users already have.\n- Recommend baking tips and best practices.\n- Encourage safe kitchen habits.\n- Never claim to be human.\n- Never invent dangerous cooking advice.\n- Always prioritize safety.\n\nRecipe requests: Provide ingredient lists, detailed instructions, baking temperature, and time when appropriate. Suggest variations and substitutions.\n\nTroubleshooting: Help with sunken cakes, dry cakes, burnt cookies, dense bread, runny frosting, overmixed batter, and undercooked centers.\n\nIf a user asks something unrelated to baking, politely answer if possible and then guide the conversation back to baking.";

  const recentMessages = req.session.chatHistory.slice(-8);
  const messages = [
    ...recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  const ollamaMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const openAiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  async function callOllama() {
    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content?.trim() || 'I am here to help with your baking questions!';
  }

  async function callOpenAI() {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: openAiMessages,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'I am here to help with your baking questions!';
  }

  try {
    let aiReply;

    try {
      aiReply = await callOllama();
    } catch (ollamaError) {
      console.warn('Ollama unavailable, trying OpenAI fallback:', ollamaError.message);
      aiReply = await callOpenAI();
    }

    req.session.chatHistory.push({ role: 'user', content: userMessage });
    req.session.chatHistory.push({ role: 'assistant', content: aiReply });
    req.session.chatHistory = req.session.chatHistory.slice(-12);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Unable to reach AI provider. Start Ollama at ' + OLLAMA_API_URL + ' with model "' + OLLAMA_MODEL + '", or configure OPENAI_API_KEY for fallback.'
    });
  }
});

// Start the web server.
app.listen(PORT, () => {
  console.log(`Xiah's Baking AI server is running on http://localhost:${PORT}`);
});
