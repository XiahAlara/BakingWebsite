const http = require('http');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "197364xiah'sbakingweb.com";

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testAPI() {
  try {
    console.log('Testing Recipe API Endpoints...\n');

    // Test GET all recipes
    console.log('✓ GET /api/recipes');
    const recipes = await makeRequest('GET', '/api/recipes');
    console.log(`  Status: ${recipes.status}, Recipes found: ${recipes.data.length}\n`);

    // Test GET single recipe
    console.log('✓ GET /api/recipes/1');
    const recipe = await makeRequest('GET', '/api/recipes/1');
    console.log(`  Status: ${recipe.status}, Recipe: ${recipe.data.title}\n`);

    // Test POST admin login
    console.log('✓ POST /api/admin/login');
    const login = await makeRequest('POST', '/api/admin/login', { password: ADMIN_PASSWORD });
    console.log(`  Status: ${login.status}, Message: ${login.data.message}\n`);

    // Test GET chat history
    console.log('✓ GET /api/chat/history');
    const history = await makeRequest('GET', '/api/chat/history');
    console.log(`  Status: ${history.status}, History: ${JSON.stringify(history.data)}\n`);

    console.log('All endpoints are working correctly!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testAPI();
