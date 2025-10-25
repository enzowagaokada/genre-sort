import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/is-authenticated/`, {
      credentials: 'include',
  }).then((res) => res.json())
    .then((data) => {
      setIsAuthenticated(data.status);
      if (data.status) {
        setUser(data.user);
      }
    })
    .catch(() => {
      setIsAuthenticated(false);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [])

  const handleFetchPlaylists = () => {
    navigate('/playlists');
  };

  if (isLoading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div>
      {/* Home Page */}
      <div className="container">
        <header>
          <h1>Genre Sort  </h1>
          <p className="subtitle">Sort your playlists by genre.</p>
        </header>

        <main className="card">
          {isAuthenticated && user ? (
            <div>
              {user.image_url && <img src={user.image_url} alt="User profile" className="profile-pic" />}
              <h2>Hi, {user.name}!</h2>
              <p>Ready to sort your playlists? Click the button below to get started.</p>
              <button onClick={handleFetchPlaylists}>
                Fetch My Playlists
              </button>
            </div>
          ) : (
            <div>
              <h2>Welcome!</h2>
              <p>Please log in with your Spotify account to continue.</p>
              <a href={`${API_BASE_URL}/api/login/`}>
                <button>
                  Login with Spotify
                </button>
              </a>
            </div>
          )}
        </main>
        <footer>
            Created by <a href="https://github.com/enzowagaokada" target="_blank" rel="noopener noreferrer">Enzo Waga Okada</a>
          <p>
            Powered by the <a href="https://developer.spotify.com/" target="_blank" rel="noopener noreferrer">Spotify Web API</a>.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;