import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Playlists.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const navigate = useNavigate();
 
  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }
      
      const data = await response.json();
      setPlaylists(data.playlists);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlaylistSelection = (playlistId) => {
    setSelectedPlaylist(prev => 
      prev === playlistId ? null : playlistId
    );
  };

  const handleContinue = () => {
    if (!selectedPlaylist) {
      alert('Please select one playlist');
      return;
    }
    // Navigate to sorting page with selected playlist
    navigate('/sort', {state: {playlistId: selectedPlaylist}});
  };

  if (isLoading) {
    return <div className="loading-message">
            <h2>Loading your playlists...</h2>
          </div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>Your Playlists</h1>
        <p className="subtitle">
          Select the playlist you want to sort by genre
        </p>
      </header>

      <main className="playlists-grid">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className={`playlist-card ${
              selectedPlaylist === playlist.id ? 'selected' : ''
            }`}
            onClick={() => togglePlaylistSelection(playlist.id)}
          >
            {playlist.image_url && (
              <img
                src={playlist.image_url}
                alt={playlist.name}
                className="playlist-image"
              />
            )}
            <div className="playlist-info">
              <h3>{playlist.name}</h3>
              <p>{playlist.track_count} tracks</p>
            </div>
            {selectedPlaylist === playlist.id && (
              <div className="check-mark">✓</div>
            )}
          </div>
        ))}
      </main>

      <div className="actions">
        <button onClick={() => navigate('/')} className="secondary">
          Back
        </button>
        <button onClick={handleContinue} disabled={!selectedPlaylist}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default Playlists;