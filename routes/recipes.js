const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, safeName);
  }
});

const upload = multer({ storage });

module.exports = function createRecipeRoutes(db) {
  const router = express.Router();

  // GET /api/recipes
  // Return all recipes or filter by search, category, or country.
  router.get('/', (req, res) => {
    const search = req.query.search || '';
    const category = req.query.category || '';
    const country = req.query.country || '';
    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(title LIKE ? OR category LIKE ? OR ingredients LIKE ? OR country LIKE ?)');
      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue, searchValue);
    }
    if (category) {
      whereClauses.push('category LIKE ?');
      params.push(`%${category}%`);
    }
    if (country) {
      whereClauses.push('country LIKE ?');
      params.push(`%${country}%`);
    }

    const sql = `SELECT * FROM recipes ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''} ORDER BY created_at DESC`;
    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // GET /api/recipes/:id
  // Return a single recipe by id.
  router.get('/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Recipe not found.' });
      }
      res.json(row);
    });
  });

  // POST /api/recipes
  // Create a new recipe with optional image upload.
  router.post('/', upload.single('image'), (req, res) => {
    const recipe = {
      title: req.body.title || '',
      country: req.body.country || '',
      category: req.body.category || '',
      prep_time: req.body.prep_time || '',
      bake_time: req.body.bake_time || '',
      difficulty: req.body.difficulty || '',
      ingredients: req.body.ingredients || '',
      instructions: req.body.instructions || '',
      image_url: req.body.image_url || ''
    };

    if (req.file) {
      recipe.image_url = '/uploads/' + req.file.filename;
    }

    const sql = `INSERT INTO recipes (title, country, category, prep_time, bake_time, difficulty, ingredients, instructions, image_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      recipe.title,
      recipe.country,
      recipe.category,
      recipe.prep_time,
      recipe.bake_time,
      recipe.difficulty,
      recipe.ingredients,
      recipe.instructions,
      recipe.image_url
    ];

    db.run(sql, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM recipes WHERE id = ?', [this.lastID], (getErr, row) => {
        if (getErr) {
          return res.status(500).json({ error: getErr.message });
        }
        res.status(201).json(row);
      });
    });
  });

  // PUT /api/recipes/:id
  // Update an existing recipe and its optional image.
  router.put('/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!existing) {
        return res.status(404).json({ error: 'Recipe not found.' });
      }

      const updated = {
        title: req.body.title || existing.title,
        country: req.body.country || existing.country,
        category: req.body.category || existing.category,
        prep_time: req.body.prep_time || existing.prep_time,
        bake_time: req.body.bake_time || existing.bake_time,
        difficulty: req.body.difficulty || existing.difficulty,
        ingredients: req.body.ingredients || existing.ingredients,
        instructions: req.body.instructions || existing.instructions,
        image_url: existing.image_url
      };

      if (req.file) {
        updated.image_url = '/uploads/' + req.file.filename;
        if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
          const oldPath = path.join(uploadDir, path.basename(existing.image_url));
          fs.unlink(oldPath, () => {});
        }
      }

      const sql = `UPDATE recipes SET title = ?, country = ?, category = ?, prep_time = ?, bake_time = ?, difficulty = ?, ingredients = ?, instructions = ?, image_url = ? WHERE id = ?`;
      const params = [
        updated.title,
        updated.country,
        updated.category,
        updated.prep_time,
        updated.bake_time,
        updated.difficulty,
        updated.ingredients,
        updated.instructions,
        updated.image_url,
        id
      ];

      db.run(sql, params, function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }
        db.get('SELECT * FROM recipes WHERE id = ?', [id], (getErr, row) => {
          if (getErr) {
            return res.status(500).json({ error: getErr.message });
          }
          res.json(row);
        });
      });
    });
  });

  // DELETE /api/recipes/:id
  // Remove a recipe and its uploaded image file if present.
  router.delete('/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM recipes WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Recipe not found.' });
      }
      if (row.image_url && row.image_url.startsWith('/uploads/')) {
        const filePath = path.join(uploadDir, path.basename(row.image_url));
        fs.unlink(filePath, () => {});
      }
      db.run('DELETE FROM recipes WHERE id = ?', [id], function (deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ error: deleteErr.message });
        }
        res.json({ deleted: true });
      });
    });
  });

  return router;
};
