const {
  client,
  createTables,
  createUser,
  createProduct,
  createFavorite,
  fetchUsers,
  fetchProducts,
  fetchFavorites,
  destroyFavorite,
  authenticate,
  findUserWithToken
} = require('./db');
const express = require('express');
const app = express();
app.use(express.json());

//for deployment only
const path = require('path');
app.get('/', (req, res)=> res.sendFile(path.join(__dirname, '../client/dist/index.html')));
app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets'))); 

// Middleware to check if user is logged in
// This middleware should be used for any route that requires authentication
const isLoggedIn = async (req, res, next) => {
  const token = req.headers.authorization; // Get the token from the request headers
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' }); // If no token, return 401
  }
  try {
    const user = await findUserWithToken(token); // Verify the token and get the user
    req.user = user; // Attach the user to the request object
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' }); // If token is invalid, return 401
  }
};

// Added a new route for user registration
// This route should create a new user and return the user object and a token
app.post('/api/auth/register', async(req, res, next)=> {
  try {
    const { username, password } = req.body;
    const existingUser = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const newUser = await createUser({ username, password });
    // Generate a token for the new user
    const token = await jwt.sign({ id: newUser.id }, JWT);
    res.status(201).json({ user: newUser, token }); // Send the new user and token in the response
  } catch (ex) {
    next(ex);
  }
});

app.post('/api/auth/login', async(req, res, next)=> {
  try {
    res.send(await authenticate(req.body));
  }
  catch(ex){
    next(ex);
  }
});

// Uses the isLoggedIn middleware for routes that require authentication
app.get('/api/auth/me', isLoggedIn, (req, res, next)=> {
  try {
    res.send(req.user); // Send the user object attached to the request);
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users', async(req, res, next)=> {
  try {
    res.send(await fetchUsers());
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/users/:id/favorites', async(req, res, next)=> {
  try {
    res.send(await fetchFavorites(req.params.id));
  }
  catch(ex){
    next(ex);
  }
});

app.post('/api/users/:id/favorites', async(req, res, next)=> {
  try {
    res.status(201).send(await createFavorite({ user_id: req.params.id, product_id: req.body.product_id}));
  }
  catch(ex){
    next(ex);
  }
});

app.delete('/api/users/:user_id/favorites/:id', async(req, res, next)=> {
  try {
    await destroyFavorite({user_id: req.params.user_id, id: req.params.id });
    res.sendStatus(204);
  }
  catch(ex){
    next(ex);
  }
});

app.get('/api/products', async(req, res, next)=> {
  try {
    res.send(await fetchProducts());
  }
  catch(ex){
    next(ex);
  }
});

app.use((err, req, res, next)=> {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message ? err.message : err });
});

const init = async()=> {
  const port = process.env.PORT || 3000;
  await client.connect();
  console.log('connected to database');

  await createTables();
  console.log('tables created');

  // Check for existing users before seeding
  const existingUsers = await fetchUsers();
  if (existingUsers.length === 0) {
  const [moe, lucy, ethyl, curly] = await Promise.all([
    createUser({ username: 'moe', password: 'm_pw'}),
    createUser({ username: 'lucy', password: 'l_pw'}),
    createUser({ username: 'ethyl', password: 'e_pw'}),
    createUser({ username: 'curly', password: 'c_pw'})
  ]);
  const [foo, bar, bazz, quq, fip] = await Promise.all([
    createProduct({ name: 'foo' }),
    createProduct({ name: 'bar' }),
    createProduct({ name: 'bazz' }),
    createProduct({ name: 'quq' }),
    createProduct({ name: 'fip' })
  ]);
  }
  console.log('users and products created'); 
  console.log(await fetchUsers());
  console.log(await fetchProducts());

  console.log(await fetchFavorites(moe.id));
  const favorite = await createFavorite({ user_id: moe.id, product_id: foo.id });
}
  app.listen(port, ()=> console.log(`listening on port ${port}`));

init();

