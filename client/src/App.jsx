import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/is-authenticated/`, {
      credentials: 'include',
  }).then((res) => res.json())
    .then((data) => {
      setIsAuthenticated(data.status);
    })
    .catch(() => {
      setIsAuthenticated(false);
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [])

  const handleFetchPlaylists = () => {
    // TODO: Implement playlist fetching logic
    alert('Playlist fetching not implemented yet!');
  };

  if (isLoading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div>
      {/* Home Page */}
      <div className="container">
        <header>
          <h1>Genre Sort for Spotify</h1>
          <p className="subtitle">Sort your saved playlists by genre.</p>
        </header>

        <main className="card">
          {isAuthenticated ? (
            <div>
              <h2>You are logged in!</h2>
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
          <p>
            Powered by the Spotify Web API.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;