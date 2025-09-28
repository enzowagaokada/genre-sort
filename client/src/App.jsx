import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/is-authenticated/`, {
      credentials: 'include',
  }).then((res) => res.json())
    .then((data) => {
      setIsAuthenticated(data.status);
    });
  }, [])

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        {isAuthenticated ? (
          <p>You are logged in! Next step: Fetch playlists.</p>
        ) : (
          <a href={`${API_BASE_URL}/api/login/`}>
            <button>
              Login with Spotify
            </button>
          </a>
        )}
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
