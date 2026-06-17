const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'recipes.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to database');
});

const newRecipes = [
  {
    title: 'Ube Cake',
    country: 'Philippines',
    category: 'Cake',
    prep_time: '30 mins',
    bake_time: '35 mins',
    difficulty: 'Medium',
    ingredients: 'Purple yam, all-purpose flour, sugar, eggs, butter, vanilla extract, baking powder, milk, evaporated milk, condensed milk',
    instructions: '1. Boil and mash the purple yam. 2. Cream butter and sugar. 3. Add eggs one at a time. 4. Mix in mashed yam. 5. Alternate dry ingredients and milk. 6. Pour into greased pan. 7. Bake at 350°F for 35 minutes until golden.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Dorayaki',
    country: 'Japan',
    category: 'Cookie',
    prep_time: '20 mins',
    bake_time: '15 mins',
    difficulty: 'Easy',
    ingredients: 'All-purpose flour, eggs, sugar, honey, baking powder, salt, red bean paste',
    instructions: '1. Mix flour, sugar, honey, and baking powder. 2. Add beaten eggs. 3. Cook small pancakes on griddle until golden. 4. Sandwich red bean paste between two pancakes. 5. Serve warm or at room temperature.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Croissant',
    country: 'France',
    category: 'Pastry',
    prep_time: '480 mins',
    bake_time: '20 mins',
    difficulty: 'Hard',
    ingredients: 'All-purpose flour, butter, milk, sugar, salt, instant yeast, eggs',
    instructions: '1. Make dough with flour, milk, sugar, salt, and yeast. 2. Let rise for 1 hour. 3. Laminate with cold butter through multiple folds. 4. Chill between each fold. 5. Shape into crescents. 6. Final proof 2 hours. 7. Bake at 400°F for 20 minutes until golden.',
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Panettone',
    country: 'Italy',
    category: 'Bread',
    prep_time: '60 mins',
    bake_time: '60 mins',
    difficulty: 'Hard',
    ingredients: 'All-purpose flour, butter, sugar, eggs, candied fruits, raisins, vanilla, orange zest, instant yeast, milk, salt',
    instructions: '1. Make enriched dough with flour, butter, eggs, and yeast. 2. Add candied fruits and raisins. 3. Let rise 4 hours. 4. Shape in traditional mold. 5. Second rise 2 hours. 6. Bake at 375°F for 60 minutes. 7. Cool upside down.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Schwarzwälder Kirchtorte',
    country: 'Germany',
    category: 'Cake',
    prep_time: '45 mins',
    bake_time: '45 mins',
    difficulty: 'Hard',
    ingredients: 'Chocolate cake mix, heavy cream, kirsch, fresh cherries, dark chocolate, powdered sugar',
    instructions: '1. Bake chocolate cake in three layers. 2. Brush with kirsch. 3. Whip heavy cream. 4. Layer cakes with cream and cherries. 5. Cover with remaining cream. 6. Decorate with chocolate shavings and cherries. 7. Chill before serving.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Pan de Muerto',
    country: 'Mexico',
    category: 'Bread',
    prep_time: '45 mins',
    bake_time: '50 mins',
    difficulty: 'Medium',
    ingredients: 'All-purpose flour, butter, sugar, eggs, orange zest, anise seeds, instant yeast, milk, salt',
    instructions: '1. Make dough with flour, butter, sugar, eggs, orange zest, and yeast. 2. Add anise seeds. 3. Let rise 2 hours. 4. Shape into round loaves with bone-shaped decorations. 5. Final proof 1 hour. 6. Brush with sugar water. 7. Bake at 350°F for 50 minutes.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Hotteok',
    country: 'South Korea',
    category: 'Pastry',
    prep_time: '30 mins',
    bake_time: '20 mins',
    difficulty: 'Medium',
    ingredients: 'All-purpose flour, sugar, water, salt, instant yeast, brown sugar, cinnamon, vegetable oil, chopped nuts',
    instructions: '1. Make yeast dough. 2. Let rise 1 hour. 3. Divide into portions. 4. Mix filling with brown sugar, cinnamon, and nuts. 5. Fill dough balls. 6. Pan-fry in oil until golden on both sides. 7. Serve warm.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Mooncake',
    country: 'China',
    category: 'Pastry',
    prep_time: '60 mins',
    bake_time: '15 mins',
    difficulty: 'Hard',
    ingredients: 'Golden syrup, vegetable oil, all-purpose flour, red bean paste, egg yolk, salt',
    instructions: '1. Mix syrup and oil with flour to make dough. 2. Rest 4 hours. 3. Wrap paste in dough. 4. Press into mold. 5. Brush with beaten egg yolk. 6. Bake at 350°F for 15 minutes. 7. Cool completely before serving.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Gulab Jamun',
    country: 'India',
    category: 'Donut',
    prep_time: '15 mins',
    bake_time: '20 mins',
    difficulty: 'Easy',
    ingredients: 'Milk powder, all-purpose flour, ghee, sugar, cardamom, water, rose essence, oil for frying',
    instructions: '1. Mix milk powder and flour with ghee to form dough. 2. Roll into small balls. 3. Make syrup with sugar, cardamom, and water. 4. Deep fry balls until golden. 5. Immediately immerse in warm syrup. 6. Add rose essence. 7. Serve warm or cold.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Choux au Craquelin',
    country: 'France',
    category: 'Pastry',
    prep_time: '30 mins',
    bake_time: '45 mins',
    difficulty: 'Hard',
    ingredients: 'Water, butter, salt, sugar, all-purpose flour, eggs, vanilla, pastry cream filling',
    instructions: '1. Make choux paste with water, butter, salt, flour, and eggs. 2. Make craquelin topping with flour, butter, and sugar. 3. Pipe choux onto baking sheet. 4. Top with craquelin. 5. Bake at 400°F for 45 minutes until golden. 6. Fill with pastry cream. 7. Dust with powdered sugar.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Torrijas',
    country: 'Spain',
    category: 'Bread',
    prep_time: '15 mins',
    bake_time: '15 mins',
    difficulty: 'Easy',
    ingredients: 'Bread, milk, eggs, sugar, cinnamon, oil for frying, honey',
    instructions: '1. Slice bread and soak briefly in milk. 2. Dip in beaten eggs. 3. Fry in hot oil until golden on both sides. 4. Coat with cinnamon and sugar. 5. Drizzle with honey. 6. Serve warm.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Brigadeiro',
    country: 'Brazil',
    category: 'Brownie',
    prep_time: '10 mins',
    bake_time: '15 mins',
    difficulty: 'Easy',
    ingredients: 'Condensed milk, cocoa powder, butter, chocolate sprinkles',
    instructions: '1. Heat condensed milk, cocoa powder, and butter in a pot. 2. Stir constantly for 15 minutes until mixture thickens. 3. Cool slightly. 4. Roll into balls. 5. Coat with chocolate sprinkles. 6. Place in small paper cups. 7. Serve at room temperature.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Galaktoboureko',
    country: 'Greece',
    category: 'Pastry',
    prep_time: '30 mins',
    bake_time: '45 mins',
    difficulty: 'Medium',
    ingredients: 'Phyllo dough, milk, eggs, sugar, butter, cornstarch, vanilla, cinnamon, water, honey',
    instructions: '1. Make custard with milk, eggs, sugar, and cornstarch. 2. Cool and mix with vanilla. 3. Layer phyllo with butter. 4. Add custard filling. 5. Top with phyllo. 6. Bake at 350°F for 45 minutes until golden. 7. Pour hot honey syrup over finished pastry.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Baklava',
    country: 'Turkey',
    category: 'Pastry',
    prep_time: '45 mins',
    bake_time: '50 mins',
    difficulty: 'Hard',
    ingredients: 'Phyllo dough, butter, walnuts, cinnamon, sugar, water, honey, lemon juice',
    instructions: '1. Layer phyllo with melted butter. 2. Mix walnuts and cinnamon. 3. Add nut layer. 4. Continue layering. 5. Cut into diamond shapes. 6. Bake at 350°F for 50 minutes. 7. Pour hot honey syrup over warm baklava.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Stollen',
    country: 'Germany',
    category: 'Bread',
    prep_time: '60 mins',
    bake_time: '60 mins',
    difficulty: 'Hard',
    ingredients: 'All-purpose flour, butter, sugar, eggs, dried fruits, marzipan, instant yeast, milk, salt, almonds',
    instructions: '1. Make enriched dough with flour, butter, sugar, eggs, and yeast. 2. Add dried fruits and knead. 3. Let rise 2 hours. 4. Wrap marzipan inside dough. 5. Shape into loaf. 6. Proof 1 hour. 7. Bake at 375°F for 60 minutes. 8. Dust with powdered sugar while warm.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Sachertorte',
    country: 'Austria',
    category: 'Cake',
    prep_time: '45 mins',
    bake_time: '50 mins',
    difficulty: 'Hard',
    ingredients: 'Dark chocolate, butter, sugar, eggs, all-purpose flour, apricot jam, chocolate glaze',
    instructions: '1. Melt chocolate and butter. 2. Cream sugar and egg yolks. 3. Mix chocolate mixture with egg yolks. 4. Fold in beaten egg whites and flour. 5. Bake in springform at 325°F for 50 minutes. 6. Cool. 7. Spread apricot jam on cake. 8. Pour chocolate glaze over top. 9. Chill before serving.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Stroopwafel',
    country: 'Netherlands',
    category: 'Cookie',
    prep_time: '30 mins',
    bake_time: '20 mins',
    difficulty: 'Medium',
    ingredients: 'All-purpose flour, butter, sugar, eggs, cinnamon, caramel syrup',
    instructions: '1. Make waffle batter with flour, butter, sugar, and eggs. 2. Cook in waffle iron. 3. Cut warm waffle in half. 4. Fill with caramel syrup mixed with cinnamon. 5. Press together. 6. Cool on wire rack. 7. Serve over hot coffee or tea.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Lamington',
    country: 'Australia',
    category: 'Cake',
    prep_time: '45 mins',
    bake_time: '30 mins',
    difficulty: 'Medium',
    ingredients: 'Butter, sugar, eggs, all-purpose flour, baking powder, milk, cocoa powder, desiccated coconut',
    instructions: '1. Make sponge cake with butter, sugar, eggs, and flour. 2. Bake at 350°F for 30 minutes. 3. Cool and cut into squares. 4. Make chocolate sauce with cocoa and melted butter. 5. Dip cake squares in chocolate. 6. Roll in coconut. 7. Set on wire rack.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Pavlova',
    country: 'Australia',
    category: 'Cake',
    prep_time: '20 mins',
    bake_time: '60 mins',
    difficulty: 'Medium',
    ingredients: 'Egg whites, powdered sugar, cornstarch, vanilla extract, heavy cream, fresh berries',
    instructions: '1. Beat egg whites until stiff peaks form. 2. Gradually add powdered sugar. 3. Fold in cornstarch and vanilla. 4. Pipe onto parchment paper. 5. Bake at 250°F for 60 minutes. 6. Cool completely. 7. Top with whipped cream and fresh berries.',
    image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80'
  }
];

db.serialize(() => {
  db.all('SELECT COUNT(*) as count FROM recipes', (err, rows) => {
    if (err) {
      console.error('Error querying recipes:', err.message);
      return;
    }
    console.log('Current recipe count:', rows[0].count);
  });

  let inserted = 0;
  newRecipes.forEach((recipe) => {
    db.run(
      `INSERT INTO recipes (title, country, category, prep_time, bake_time, difficulty, ingredients, instructions, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipe.title,
        recipe.country,
        recipe.category,
        recipe.prep_time,
        recipe.bake_time,
        recipe.difficulty,
        recipe.ingredients,
        recipe.instructions,
        recipe.image_url
      ],
      function (err) {
        if (err) {
          console.error(`Error inserting ${recipe.title}:`, err.message);
        } else {
          inserted++;
          console.log(`✓ Inserted: ${recipe.title} (${recipe.country})`);
        }
      }
    );
  });

  setTimeout(() => {
    db.all('SELECT COUNT(*) as count FROM recipes', (err, rows) => {
      if (err) {
        console.error('Error querying recipes:', err.message);
      } else {
        console.log('\nFinal recipe count:', rows[0].count);
        console.log(`Successfully added ${inserted} new recipes`);
      }
      db.close();
    });
  }, 2000);
});
