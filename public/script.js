const API_BASE = '/api/recipes';
const CHAT_API = '/api/chat';
const CHAT_HISTORY_API = '/api/chat/history';
const AUTH_LOGIN_API = '/api/auth/login';
const AUTH_SIGNUP_API = '/api/auth/signup';
const AUTH_SESSION_API = '/api/auth/session';
const AUTH_LOGOUT_API = '/api/auth/logout';

const recipeGrid = document.getElementById('recipe-grid');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const typingIndicator = document.getElementById('typing-indicator');

const page = document.body.dataset.page;

function showMessage(element, type, message) {
  if (!element) return;
  element.className = `status-message ${type}`;
  element.textContent = message;
  element.classList.remove('hidden');
}

function clearMessage(element) {
  if (!element) return;
  element.className = 'status-message hidden';
  element.textContent = '';
}

async function getAuthSession() {
  const response = await fetch(AUTH_SESSION_API, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error('Unable to verify session.');
  }
  return response.json();
}

function renderHomeUser(user) {
  const navUser = document.getElementById('nav-user');
  const logoutButton = document.getElementById('logout-button');
  const manageLink = document.getElementById('nav-manage-link');
  const adminLink = document.getElementById('nav-admin-link');

  if (navUser) {
    navUser.textContent = user ? `Hi, ${user.fullName}` : '';
    navUser.classList.toggle('hidden', !user);
  }

  if (logoutButton) {
    logoutButton.classList.toggle('hidden', !user);
  }

  if (manageLink) {
    const isAdmin = Boolean(user && user.isAdmin);
    manageLink.classList.toggle('hidden', !isAdmin);
  }

  if (adminLink) {
    const isAdmin = Boolean(user && user.isAdmin);
    adminLink.classList.toggle('hidden', !isAdmin);
  }
}

async function logoutUser() {
  try {
    await fetch(AUTH_LOGOUT_API, {
      method: 'POST',
      credentials: 'same-origin'
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }

  window.location.href = 'login.html';
}

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
  const logoutButton = document.getElementById('logout-button');

  (async () => {
    try {
      const sessionData = await getAuthSession();
      if (!sessionData.authenticated || !sessionData.user) {
        window.location.href = 'login.html';
        return;
      }
      renderHomeUser(sessionData.user);
    } catch (error) {
      console.error('Session restore failed:', error);
      window.location.href = 'login.html';
      return;
    }

    loadRecipes();
    loadChatHistory();
  })();

  searchButton.addEventListener('click', () => loadRecipes(searchInput.value));
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      loadRecipes(searchInput.value);
    }
  });
  chatForm?.addEventListener('submit', handleChat);
  logoutButton?.addEventListener('click', logoutUser);
}

if (page === 'login') {
  const loginForm = document.getElementById('login-user-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const statusEl = document.getElementById('login-status');

  (async () => {
    try {
      const sessionData = await getAuthSession();
      if (sessionData.authenticated) {
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  })();

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(statusEl);

    const email = String(emailInput?.value || '').trim();
    const password = String(passwordInput?.value || '');

    if (!email || !password) {
      showMessage(statusEl, 'error', 'Email and password are required.');
      return;
    }

    try {
      const response = await fetch(AUTH_LOGIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showMessage(statusEl, 'error', data.error || 'Invalid email or password.');
        passwordInput.value = '';
        return;
      }

      showMessage(statusEl, 'success', 'Login successful. Redirecting...');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Login failed:', error);
      showMessage(statusEl, 'error', 'Unable to log in right now. Please try again.');
    }
  });
}

if (page === 'signup') {
  const signupForm = document.getElementById('signup-user-form');
  const fullNameInput = document.getElementById('signup-name');
  const emailInput = document.getElementById('signup-email');
  const passwordInput = document.getElementById('signup-password');
  const confirmPasswordInput = document.getElementById('signup-confirm-password');
  const statusEl = document.getElementById('signup-status');

  (async () => {
    try {
      const sessionData = await getAuthSession();
      if (sessionData.authenticated) {
        window.location.href = 'index.html';
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  })();

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(statusEl);

    const fullName = String(fullNameInput?.value || '').trim();
    const email = String(emailInput?.value || '').trim();
    const password = String(passwordInput?.value || '');
    const confirmPassword = String(confirmPasswordInput?.value || '');

    if (!fullName || !email || !password || !confirmPassword) {
      showMessage(statusEl, 'error', 'All fields are required.');
      return;
    }

    if (password.length < 8) {
      showMessage(statusEl, 'error', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showMessage(statusEl, 'error', 'Passwords do not match.');
      return;
    }

    try {
      const response = await fetch(AUTH_SIGNUP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fullName, email, password, confirmPassword })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showMessage(statusEl, 'error', data.error || 'Unable to create account.');
        return;
      }

      showMessage(statusEl, 'success', 'Account created. Redirecting...');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Signup failed:', error);
      showMessage(statusEl, 'error', 'Unable to create account right now. Please try again.');
    }
  });
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

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    window.location.href = 'login.html';
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

  (async () => {
    try {
      const sessionData = await getAuthSession();
      if (!sessionData.authenticated || !sessionData.user || !sessionData.user.isAdmin) {
        window.location.href = 'login.html';
        return;
      }

      loginForm?.classList.add('hidden');
      adminDashboard?.classList.remove('hidden');
      renderAdminRecipes();
    } catch (error) {
      console.error('Admin session verification failed:', error);
      window.location.href = 'login.html';
    }
  })();
}

// Recipe Management Page
if (page === 'recipe-management') {
  const authSection = document.getElementById('auth-section');
  const managementDashboard = document.getElementById('management-dashboard');
  const authForm = document.getElementById('auth-form');
  const authStatus = document.getElementById('auth-status');
  const dashboardStatus = document.getElementById('dashboard-status');
  const logoutButton = document.getElementById('logout-btn');
  const createRecipeBtn = document.getElementById('create-recipe-btn');
  const formSection = document.getElementById('form-section');
  const closeFormBtn = document.getElementById('close-form-btn');
  const recipeForm = document.getElementById('recipe-form');
  const cancelRecipeBtn = document.getElementById('cancel-recipe');
  const recipeListContainer = document.getElementById('recipe-list-container');
  const filterInput = document.getElementById('filter-input');
  const searchButtonManagement = document.getElementById('search-button-management');
  const clearSearchButton = document.getElementById('clear-search-management');
  const recipeCountSpan = document.getElementById('recipe-count');
  const formTitle = document.getElementById('form-title');

  const mgmtFields = {
    id: document.getElementById('recipe-id'),
    title: document.getElementById('title'),
    description: document.getElementById('description'),
    category: document.getElementById('category'),
    cooking_time: document.getElementById('cooking_time'),
    difficulty: document.getElementById('difficulty'),
    ingredients: document.getElementById('ingredients'),
    instructions: document.getElementById('instructions'),
    image: document.getElementById('image')
  };

  let allRecipes = [];
  let currentSearch = '';

  function showStatus(element, type, message) {
    if (!element) return;
    element.className = `status-message ${type}`;
    element.textContent = message;
    element.classList.remove('hidden');
  }

  function clearStatus(element) {
    if (!element) return;
    element.className = 'status-message hidden';
    element.textContent = '';
  }

  function setRecipeListLoading(message) {
    recipeListContainer.innerHTML = `<div class="loading">${message}</div>`;
  }

  function showDashboard() {
    authSection.classList.add('hidden');
    managementDashboard.classList.remove('hidden');
  }

  function showAuth() {
    managementDashboard.classList.add('hidden');
    authSection.classList.remove('hidden');
  }

  function resetMgmtForm() {
    mgmtFields.id.value = '';
    mgmtFields.title.value = '';
    mgmtFields.description.value = '';
    mgmtFields.category.value = '';
    mgmtFields.cooking_time.value = '';
    mgmtFields.difficulty.value = 'Easy';
    mgmtFields.ingredients.value = '';
    mgmtFields.instructions.value = '';
    mgmtFields.image.value = '';
    formSection.classList.add('hidden');
    formTitle.textContent = 'Create New Recipe';
  }

  function populateMgmtForm(recipe) {
    mgmtFields.id.value = recipe.id;
    mgmtFields.title.value = recipe.title;
    mgmtFields.description.value = recipe.description || '';
    mgmtFields.category.value = recipe.category;
    mgmtFields.cooking_time.value = recipe.cooking_time || recipe.bake_time || '';
    mgmtFields.difficulty.value = recipe.difficulty;
    mgmtFields.ingredients.value = recipe.ingredients;
    mgmtFields.instructions.value = recipe.instructions;
    formTitle.textContent = 'Edit Recipe';
    formSection.classList.remove('hidden');
    formSection.scrollIntoView({ behavior: 'smooth' });
  }

  async function fetchAllMgmtRecipes(search = '') {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set('search', search.trim());
    }

    const response = await fetch(`${API_BASE}?${params.toString()}`, {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error('Unable to load recipes.');
    }

    const recipes = await response.json();
    allRecipes = recipes;
    recipeCountSpan.textContent = recipes.length;
    return recipes;
  }

  function renderRecipeTable(recipes = allRecipes) {
    if (recipes.length === 0) {
      recipeListContainer.innerHTML = '<p class="no-recipes">No recipes found yet. Try a different search or add your first recipe.</p>';
      return;
    }

    let html = '<div class="management-recipe-grid">';

    recipes.forEach((recipe) => {
      html += `<article class="management-recipe-card" data-id="${recipe.id}">
        <img src="${recipe.image_url || 'https://images.unsplash.com/photo-1512058564366-c9e5d6b04a7e?auto=format&fit=crop&w=1200&q=80'}" alt="${recipe.title}" class="management-recipe-image" />
        <div class="management-recipe-content">
          <h3>${recipe.title}</h3>
          <p class="management-recipe-description">${recipe.description || 'No description provided yet.'}</p>
          <div class="management-meta-row">
            <span class="category-tag">${recipe.category || 'Baking'}</span>
            <span class="difficulty-${(recipe.difficulty || 'easy').toLowerCase()}">${recipe.difficulty || 'Easy'}</span>
            <span class="category-tag">Cook: ${recipe.cooking_time || recipe.bake_time || 'N/A'}</span>
          </div>
        </div>
        <div class="recipe-actions">
          <button class="button button-sm button-secondary edit-recipe-btn" data-id="${recipe.id}">Edit</button>
          <button class="button button-sm button-danger delete-recipe-btn" data-id="${recipe.id}">Delete</button>
        </div>
      </article>`;
    });

    html += '</div>';
    recipeListContainer.innerHTML = html;

    document.querySelectorAll('.edit-recipe-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const recipe = allRecipes.find((r) => r.id == btn.dataset.id);
        if (recipe) populateMgmtForm(recipe);
      });
    });

    document.querySelectorAll('.delete-recipe-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const recipe = allRecipes.find((r) => r.id == btn.dataset.id);
        if (!recipe) return;
        if (!confirm(`Are you sure you want to delete "${recipe.title}"? This action cannot be undone.`)) return;

        try {
          clearStatus(dashboardStatus);
          const response = await fetch(`${API_BASE}/${recipe.id}`, {
            method: 'DELETE',
            credentials: 'same-origin'
          });

          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to delete recipe.');
          }

          showStatus(dashboardStatus, 'success', `Deleted "${recipe.title}" successfully.`);
          await renderMgmtRecipes();
        } catch (error) {
          console.error('Error deleting recipe:', error);
          showStatus(dashboardStatus, 'error', error.message || 'Failed to delete recipe.');
        }
      });
    });
  }

  async function renderMgmtRecipes() {
    try {
      setRecipeListLoading('Loading recipes...');
      const recipes = await fetchAllMgmtRecipes(currentSearch);
      renderRecipeTable(recipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      recipeListContainer.innerHTML = '<p class="no-recipes">Unable to load recipes right now.</p>';
      showStatus(dashboardStatus, 'error', error.message || 'Unable to load recipes.');
    }
  }

  async function runSearch() {
    currentSearch = filterInput.value.trim();
    clearStatus(dashboardStatus);
    await renderMgmtRecipes();
  }

  searchButtonManagement.addEventListener('click', runSearch);
  clearSearchButton.addEventListener('click', async () => {
    filterInput.value = '';
    currentSearch = '';
    clearStatus(dashboardStatus);
    await renderMgmtRecipes();
  });
  filterInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await runSearch();
    }
  });

  createRecipeBtn.addEventListener('click', () => {
    resetMgmtForm();
    formSection.classList.remove('hidden');
    formSection.scrollIntoView({ behavior: 'smooth' });
  });

  closeFormBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetMgmtForm();
  });

  cancelRecipeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetMgmtForm();
  });

  recipeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus(dashboardStatus);

    const formData = new FormData();
    formData.append('title', mgmtFields.title.value);
    formData.append('description', mgmtFields.description.value);
    formData.append('category', mgmtFields.category.value);
    formData.append('cooking_time', mgmtFields.cooking_time.value);
    formData.append('difficulty', mgmtFields.difficulty.value);
    formData.append('ingredients', mgmtFields.ingredients.value);
    formData.append('instructions', mgmtFields.instructions.value);
    if (mgmtFields.image.files[0]) {
      formData.append('image', mgmtFields.image.files[0]);
    }

    try {
      const method = mgmtFields.id.value ? 'PUT' : 'POST';
      const url = mgmtFields.id.value ? `${API_BASE}/${mgmtFields.id.value}` : API_BASE;
      const response = await fetch(url, { method, body: formData, credentials: 'same-origin' });

      if (response.ok) {
        showStatus(
          dashboardStatus,
          'success',
          mgmtFields.id.value ? 'Recipe updated successfully.' : 'Recipe created successfully.'
        );
        resetMgmtForm();
        await renderMgmtRecipes();
      } else {
        const body = await response.json().catch(() => ({}));
        showStatus(dashboardStatus, 'error', body.error || 'Error saving recipe. Please try again.');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      showStatus(dashboardStatus, 'error', 'Failed to save recipe. Please try again.');
    }
  });

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showStatus(authStatus, 'info', 'Please sign in with an administrator account from the login page.');
    window.location.href = 'login.html';
  });

  logoutButton.addEventListener('click', async () => {
    try {
      await fetch(AUTH_LOGOUT_API, {
        method: 'POST',
        credentials: 'same-origin'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }

    window.location.href = 'login.html';
  });

  (async function initializeManagementPage() {
    setRecipeListLoading('Loading recipes...');
    try {
      const sessionData = await getAuthSession();
      if (sessionData.authenticated && sessionData.user && sessionData.user.isAdmin) {
        showDashboard();
        await renderMgmtRecipes();
      } else {
        window.location.href = 'login.html';
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      window.location.href = 'login.html';
    }
  })();
}
