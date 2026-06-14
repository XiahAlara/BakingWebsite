# Xiah's Baking AI

A beginner-friendly full-stack baking website with recipe search, AI helper demo, and admin recipe management.

## Project Structure

- `public/`
  - `index.html` - Home page with search and AI helper.
  - `admin.html` - Password-protected admin page.
  - `style.css` - Styling for the whole site.
  - `script.js` - Frontend JavaScript for search, chat, and admin actions.
- `uploads/` - Folder for recipe image uploads.
- `database/recipes.db` - SQLite database file.
- `routes/recipes.js` - Recipe API route handlers.
- `server.js` - Express server setup.
- `package.json` - Node dependencies and start script.

## Install and Run

1. Open the project folder in a terminal.
2. Create a `.env` file in the project root with:

```
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=some_secret_value
```

3. Run `npm install` to install dependencies.
4. Run `npm start` to start the server.
5. Open `http://localhost:3000` in your browser.

## AI Chatbot

The chat assistant uses the OpenAI API and stores the last few messages in the session. It is specialized in:
- Baking recipes
- Cakes, cookies, bread, cupcakes, brownies
- Baking tips and techniques

If the user asks a non-baking question, the assistant redirects politely back to baking topics.

## Admin Panel

- Open `http://localhost:3000/admin.html`
- Password: `xiahbakes123`
- Add, edit, delete recipes.
- Upload recipe images from admin panel.

## API Endpoints

- `GET /api/recipes` - Get all recipes or search with `?search=word`.
- `GET /api/recipes/:id` - Get a single recipe.
- `POST /api/recipes` - Create a recipe.
- `PUT /api/recipes/:id` - Update a recipe.
- `DELETE /api/recipes/:id` - Delete a recipe.

## Notes

- This project stores recipes in `database/recipes.db`.
- Images are uploaded into `uploads/` and served from `/uploads`.
- The AI helper is a demo and returns sample responses.
