import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Sort () {
    const [genreGroups, setGenreGroups] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [creatingPlaylist, setCreatingPlaylist] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    // Get playlistID from state from Playlist.jsx navigate
    const playlistId = location.state?.playlistId;

    // Set up for sort page
    // ensures that there is a playlistId to use and then sorts
    useEffect(() => {
        if (!playlistId) {
            navigate('/playlists');
            return;
        }
        fetchAndSortTracks();
    }, [playlistId]);

    // fetch and sort function
    const fetchAndSortTracks = async () => {
        try {
            // get response from api w/ playlistId
            const response = await fetch (
                `${API_BASE_URL}/api/sort-playlist/${playlistId}/`,
                {
                    credentials: 'include',
                });
            // if response didn't work, throw error
            if (!response.ok) {
                throw new Error('Failed to sort playlist');
            }

            //create data by making response a json
            const data = await response.json();
            // create the genre groups using the data
            setGenreGroups(data.genre_groups);
        } catch (err) {
            // if there was an error, setError is called
            setError(err.message);
        } finally {
            // if no errors occured, set IsLoading to false
            setIsLoading(false);
        }
    }

    // Create specific genre playlist
    const CreatePlaylist = async (genre) => {
        setCreatingPlaylist(genre);
        try {
            // Await POST response from API
            const response = await fetch(
                `${API_BASE_URL}/api/create-playlist/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                    playlist_id: playlistId,
                    genre: genre,
                    }),
                }
            );
            // If response is not good, throw failed error
            if (!response.ok) {
                throw new Error('Failed to create playlist');
            }
            
            // Playlist creation is successful
            const data = await response.json();
            alert(`Playlist "${data.playlist_name}" created successfully!`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            // Reset CreatingPlaylist to null
            setCreatingPlaylist(null);
        }
    }
    // If isLoading is true, render loading page
    if (isLoading) {
    return (
        <div className="container">
            <div className="loading-message">
                <h2>Analyzing your playlist...</h2>
                <p>This may take a moment while we categorize tracks by genre.</p>
            </div>
        </div>
        );
    }
    // If there is an error, render the error page
    if (error) {
        return (
        <div className="container">
            <div className="card">
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/playlists')}>Back to Playlists</button>
            </div>
      </div>
    );
  }

    const genreEntries = Object.entries(genreGroups);
    return (
        <div className="container">
            <header>
                <h1>Sorted by Genre</h1>
                <p className="subtitle">
                Found {genreEntries.length} genres • Click to create a new playlist
                </p>
            </header>

            <main className="genres-container">
                {genreEntries.map(([genre, tracks]) => (
                <div key={genre} className="genre-section">
                    <div className="genre-header">
                        <div>
                        <h2>{genre}</h2>
                        <p>{tracks.length} tracks</p>
                        </div>
                        <button
                            onClick={() => CreatePlaylist(genre)}
                            disabled={creatingPlaylist === genre}
                            className="create-btn"
                        >
                        {creatingPlaylist === genre ? 'Creating...' : 'Create Playlist'}
                        </button>
                    </div>
                    <div className="tracks-list">
                        {tracks.map((track, index) => (
                            <div key={index} className="track-item">
                                <div className="track-info">
                                    <span className="track-name">{track.name}</span>
                                    <span className="track-artist">{track.artist}</span>
                            </div>
                                </div>
                    ))}
                    </div>
                </div>
                ))}
            </main>

            <div className="actions">
                <button onClick={() => navigate('/playlists')} className="secondary">
                    Back to Playlists
                </button>
            </div>
        </div>
    );
}

export default Sort;