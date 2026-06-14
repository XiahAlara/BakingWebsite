const API_BASE = '/api/recipes';
const CHAT_API = '/api/chat';
const CHAT_HISTORY_API = '/api/chat/history';

const recipeGrid = document.getElementById('recipe-grid');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const typingIndicator = document.getElementById('typing-indicator');

const page = document.body.dataset.page;

async function fetchRecipes(query = '') {
  const params = new URLSearchParams();
  if (query) {
    params.set('search', query);
  }
  const response = await fetch(`${API_BASE}?${params.toString()}`);
  const recipes = await response.json();
  return recipes;
}

function createRecipeCard(recipe) {
  const card = document.createElement('article');
  card.className = 'recipe-card';

  const image = document.createElement('img');
  image.src = recipe.image_url || 'https://images.unsplash.com/photo-1512058564366-c9e5d6b04a7e?auto=format&fit=crop&w=1200&q=80';
  image.alt = recipe.title;

  const content = document.createElement('div');
  content.className = 'recipe-card-content';

  content.innerHTML = `
    <div class="tag-row">
      <span class="tag">${recipe.category || 'Baking'}</span>
      <span class="tag">${recipe.country || 'Global'}</span>
    </div>
    <h3>${recipe.title}</h3>
    <p><strong>Ingredients:</strong> ${recipe.ingredients}</p>
    <p><strong>Instructions:</strong> ${recipe.instructions}</p>
    <p class="tag-row"><span class="tag">Prep: ${recipe.prep_time || 'N/A'}</span><span class="tag">Bake: ${recipe.bake_time || 'N/A'}</span><span class="tag">${recipe.difficulty || 'Easy'}</span></p>
  `;

  card.appendChild(image);
  card.appendChild(content);
  return card;
}

async function loadRecipes(query = '') {
  recipeGrid.innerHTML = '<p>Loading recipes...</p>';
  try {
    const recipes = await fetchRecipes(query);
    recipeGrid.innerHTML = '';
    if (recipes.length === 0) {
      recipeGrid.innerHTML = '<p>No recipes found. Try a different ingredient or category.</p>';
      return;
    }
    recipes.forEach((recipe) => recipeGrid.appendChild(createRecipeCard(recipe)));
  } catch (error) {
    recipeGrid.innerHTML = '<p>Unable to load recipes. Please try again later.</p>';
    console.error('Recipe load error:', error);
  }
}

function addMessage(text, author) {
  const message = document.createElement('div');
  message.className = `message ${author}`;
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  message.appendChild(bubble);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setTyping(active) {
  if (!typingIndicator) return;
  typingIndicator.classList.toggle('hidden', !active);
}

async function loadChatHistory() {
  if (!CHAT_HISTORY_API) return;
  try {
    const response = await fetch(CHAT_HISTORY_API);
    const history = await response.json();
    chatMessages.innerHTML = '';
    history.forEach((item) => {
      addMessage(item.content, item.role === 'assistant' ? 'ai' : 'user');
    });
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
}

async function handleChat(event) {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  chatInput.value = '';
  setTyping(true);

  try {
    const response = await fetch(CHAT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await response.json();
    if (response.ok) {
      addMessage(data.reply, 'ai');
    } else {
      addMessage(data.error || 'Sorry, something went wrong. Try again later.', 'ai');
    }
  } catch (error) {
    console.error('Chat request failed:', error);
    addMessage('Sorry, I could not connect to the baking assistant.', 'ai');
  } finally {
    setTyping(false);
  }
}

if (page === 'home') {
  loadRecipes();
  searchButton.addEventListener('click', () => loadRecipes(searchInput.value));
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      loadRecipes(searchInput.value);
    }
  });
  chatForm?.addEventListener('submit', handleChat);
  loadChatHistory();
}

if (page === 'admin') {
  const loginForm = document.getElementById('login-form');
  const adminDashboard = document.getElementById('admin-dashboard');
  const recipeForm = document.getElementById('recipe-form');
  const adminRecipeList = document.getElementById('admin-recipe-list');
  const cancelEditButton = document.getElementById('cancel-edit');

  const fields = {
    id: document.getElementById('recipe-id'),
    title: document.getElementById('title'),
    country: document.getElementById('country'),
    category: document.getElementById('category'),
    prep_time: document.getElementById('prep_time'),
    bake_time: document.getElementById('bake_time'),
    difficulty: document.getElementById('difficulty'),
    ingredients: document.getElementById('ingredients'),
    instructions: document.getElementById('instructions'),
    image: document.getElementById('image')
  };

  async function fetchAllRecipes() {
    const response = await fetch(API_BASE);
    return response.json();
  }

  function resetForm() {
    fields.id.value = '';
    fields.title.value = '';
    fields.country.value = '';
    fields.category.value = '';
    fields.prep_time.value = '';
    fields.bake_time.value = '';
    fields.difficulty.value = 'Easy';
    fields.ingredients.value = '';
    fields.instructions.value = '';
    fields.image.value = '';
    cancelEditButton.classList.add('hidden');
  }

  function populateForm(recipe) {
    fields.id.value = recipe.id;
    fields.title.value = recipe.title;
    fields.country.value = recipe.country;
    fields.category.value = recipe.category;
    fields.prep_time.value = recipe.prep_time;
    fields.bake_time.value = recipe.bake_time;
    fields.difficulty.value = recipe.difficulty;
    fields.ingredients.value = recipe.ingredients;
    fields.instructions.value = recipe.instructions;
    cancelEditButton.classList.remove('hidden');
  }

  async function renderAdminRecipes() {
    const recipes = await fetchAllRecipes();
    adminRecipeList.innerHTML = '';
    if (recipes.length === 0) {
      adminRecipeList.innerHTML = '<p>No recipes available yet.</p>';
      return;
    }

    recipes.forEach((recipe) => {
      const card = document.createElement('div');
      card.className = 'admin-recipe-card';
      card.innerHTML = `
        <h4>${recipe.title}</h4>
        <p><strong>Category:</strong> ${recipe.category || 'Baking'}</p>
        <p><strong>Country:</strong> ${recipe.country || 'Global'}</p>
        <p><strong>Prep:</strong> ${recipe.prep_time || 'N/A'} • <strong>Bake:</strong> ${recipe.bake_time || 'N/A'}</p>
        <div class="admin-recipe-actions">
          <button class="button button-secondary edit-button">Edit</button>
          <button class="button button-secondary delete-button">Delete</button>
        </div>
      `;

      card.querySelector('.edit-button').addEventListener('click', () => populateForm(recipe));
      card.querySelector('.delete-button').addEventListener('click', async () => {
        if (!confirm(`Delete recipe '${recipe.title}'?`)) return;
        await fetch(`${API_BASE}/${recipe.id}`, { method: 'DELETE' });
        renderAdminRecipes();
      });

      adminRecipeList.appendChild(card);
    });
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('admin-password').value;
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (response.ok) {
      loginForm.classList.add('hidden');
      adminDashboard.classList.remove('hidden');
      renderAdminRecipes();
    } else {
      alert('Password is incorrect. Please try again.');
    }
  });

  recipeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('title', fields.title.value);
    formData.append('country', fields.country.value);
    formData.append('category', fields.category.value);
    formData.append('prep_time', fields.prep_time.value);
    formData.append('bake_time', fields.bake_time.value);
    formData.append('difficulty', fields.difficulty.value);
    formData.append('ingredients', fields.ingredients.value);
    formData.append('instructions', fields.instructions.value);
    if (fields.image.files[0]) {
      formData.append('image', fields.image.files[0]);
    }

    const method = fields.id.value ? 'PUT' : 'POST';
    const url = fields.id.value ? `${API_BASE}/${fields.id.value}` : API_BASE;
    await fetch(url, { method, body: formData });
    resetForm();
    renderAdminRecipes();
  });

  cancelEditButton.addEventListener('click', (event) => {
    event.preventDefault();
    resetForm();
  });
}
