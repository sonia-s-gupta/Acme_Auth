import { useState, useEffect } from 'react'


const AuthForm = ({ authAction }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // New state to track if the user is registering
  const [error, setError] = useState(null); // New state to track error messages

  const submit = async (ev) => {
    ev.preventDefault();
    setError(null); // Reset error state on submit

  // Check if the user is registering or logging in
    try {
      await authAction({ username, password });
    } catch (err) {
      setError(err.message); // Set error message if login fails
    }
  };
  
  // Toggle between login and register
  return (
    <form onSubmit={ submit }>
      <input value={ username } placeholder='username' onChange={ ev=> setUsername(ev.target.value)}/>
      <input value={ password} placeholder='password' onChange={ ev=> setPassword(ev.target.value)}/>
      <button disabled={!username || !password}>{isRegistering ? 'Register' : 'Login'}</button> 

      {error && <div className="error">{error}</div>} {/* Display error message if exists */}
      <button type="button" onClick={() => setIsRegistering(!isRegistering)}>
      {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
      </button>
    </form>
  );
}

function App() {
  const [auth, setAuth] = useState({});
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(()=> {
    attemptLoginWithToken();
  }, []);

  const attemptLoginWithToken = async()=> {
    const token = window.localStorage.getItem('token');
    if(token){
      const response = await fetch(`/api/auth/me`, {
        headers: {
          authorization: token
        }
      });
      const json = await response.json();
      if(response.ok){
        setAuth(json);
      }
      else {
        window.localStorage.removeItem('token');
      }
    }
  };

  useEffect(()=> {
    const fetchProducts = async()=> {
      const response = await fetch('/api/products');
      const json = await response.json();
      setProducts(json);
    };

    fetchProducts();
  }, []);

  // Fetch favorites when auth changes
  // If auth.id is not set, set favorites to an empty array
  // If auth.id is set, fetch favorites from the server
  useEffect(()=> {
    const fetchFavorites = async()=> {
      const response = await fetch(`/api/users/${auth.id}/favorites`, {
        headers: {
          authorization: window.localStorage.getItem('token') // Pass the token in the headers
        }
      });
      const json = await response.json();
      if(response.ok){
        setFavorites(json);
      }
      else {
        console.log(json); // Handle error
      }
    };
    if(auth.id){
      fetchFavorites();
    }
    else {
      setFavorites([]);
    }
  }, [auth]);

  // Update the login function to include the isRegistering state
  const loginOrRegister = async({ username, password, isRegistering })=> {
    const url = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();
    if(response.ok){
      window.localStorage.setItem('token', json.token);
      // Directly set the auth state with the response
     attemptLoginWithToken();
    }
    else {
      console.log(json);
    }
  };

  const addFavorite = async(product_id)=> {
    const response = await fetch(`/api/users/${auth.id}/favorites`, {
      method: 'POST',
      body: JSON.stringify({ product_id }),
      headers: {
        'Content-Type': 'application/json',
        authorization: window.localStorage.getItem('token') // Pass the token in the headers
      }
    });

    const json = await response.json();
    if(response.ok){
      setFavorites([...favorites, json]);
    }
    else {
      console.log(json);
    }
  };

  const removeFavorite = async(id)=> {
    const response = await fetch(`/api/users/${auth.id}/favorites/${id}`, {
      method: 'DELETE',
      // Pass the token in the headers
      headers: {
        authorization: window.localStorage.getItem('token')
      }
    });

    if(response.ok){
      setFavorites(favorites.filter(favorite => favorite.id !== id));
    }
    else {
      console.log(json);
    }
  };

  const logout = ()=> {
    window.localStorage.removeItem('token');
    setAuth({});
  };

  return (
    <>
      {
        // Check if auth.id is set to determine if the user is logged in
        !auth.id ? <AuthForm authAction={loginOrRegister} /> : <button onClick={logout}>Logout {auth.username}</button>      }
      <ul>
        {
          products.map( product => {
            const isFavorite = favorites.find(favorite => favorite.product_id === product.id);
            return (
              <li key={ product.id } className={ isFavorite ? 'favorite': ''}>
                { product.name }
                {
                  auth.id && isFavorite && <button onClick={()=> removeFavorite(isFavorite.id)}>-</button>
                }
                {
                  auth.id && !isFavorite && <button onClick={()=> addFavorite(product.id)}>+</button>
                }
              </li>
            );
          })
        }
      </ul>
    </>
  );
}

export default App;
