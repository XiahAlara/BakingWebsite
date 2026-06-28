const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database/recipes.db');

db.get('SELECT COUNT(*) as count FROM recipes', (err, row) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  console.log('Total recipes in database:', row.count);
  
  db.all('SELECT id, title, country FROM recipes LIMIT 5', (err, rows) => {
    console.log('\nFirst 5 recipes:');
    rows.forEach(r => console.log(`  [${r.id}] ${r.title} (${r.country})`));
    db.close();
  });
});
