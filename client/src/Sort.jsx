import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sort.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Sort () {
    const [genreGroups, setGenreGroups] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [creatingPlaylist, setCreatingPlaylist] = useState(null);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [selectedTrackGenre, setSelectedTrackGenre] = useState(null);
    const [showGenreSelector, setShowGenreSelector] = useState(false);
    const [combineMode, setCombineMode] = useState(false);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [showArtistGenreSelector, setShowArtistGenreSelector] = useState(false);
    const [showTrackModal, setShowTrackModal] = useState(false);

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

    const fetchAndSortTracks = async () => {
        try {
            const response = await fetch (
                `${API_BASE_URL}api/sort-playlist/${playlistId}/`,
                {
                    credentials: 'include',
                });
            if (!response.ok) {
                throw new Error('Failed to sort playlist');
            }

            const data = await response.json();
            setGenreGroups(data.genre_groups);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    const CreatePlaylist = async (genre) => {
        setCreatingPlaylist(genre);
        try {
            const response = await fetch(
                `${API_BASE_URL}api/create-playlist/`,
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
            if (!response.ok) {
                throw new Error('Failed to create playlist');
            }
            
            const data = await response.json();
            alert(`Playlist "${data.playlist_name}" created successfully!`);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setCreatingPlaylist(null);
        }
    }

    const assignGenreToTrack = async (trackUri, newGenre, currentGenre) => {
        try {
            const response = await fetch(`${API_BASE_URL}api/assign-genre/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    playlist_id: playlistId,
                    track_uri: trackUri,
                    genre: newGenre,
                    current_genre: currentGenre
                })
            });

            if (!response.ok) {
                throw new Error('Failed to assign genre');
            }

            const data = await response.json();
            setGenreGroups(data.genre_groups);
            setShowGenreSelector(false);
            setShowTrackModal(false);
            setSelectedTrack(null);
        } catch (err) {
            console.error('Error assigning genre:', err);
            alert('Failed to assign genre. Please try again.');
        }
    };

    const toggleGenreSelection = (genre) => {
        setSelectedGenres(prev => 
            prev.includes(genre) 
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };

    const combineGenres = async () => {
        if (selectedGenres.length < 2) {
            alert('Please select at least 2 genres to combine');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}api/combine-genres/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    playlist_id: playlistId,
                    genres: selectedGenres
                })
            });

            if (!response.ok) {
                throw new Error('Failed to combine genres');
            }

            const data = await response.json();
            setGenreGroups(data.genre_groups);
            setCombineMode(false);
            setSelectedGenres([]);
            alert(`Successfully combined into "${data.combined_genre_name}"`);
        } catch (err) {
            console.error('Error combining genres:', err);
            alert('Failed to combine genres. Please try again.');
        }
    };

    const assignGenreByArtist = async (artistName, newGenre, currentGenre) => {
        try {
            const response = await fetch(`${API_BASE_URL}api/assign-genre-by-artist/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    playlist_id: playlistId,
                    artist_name: artistName,
                    genre: newGenre,
                    current_genre: currentGenre
                })
            });

            if (!response.ok) {
                throw new Error('Failed to assign genre by artist');
            }

            const data = await response.json();
            setGenreGroups(data.genre_groups);
            setShowArtistGenreSelector(false);
            setShowTrackModal(false);
            setSelectedTrack(null);
            alert(`Successfully moved ${data.tracks_moved} tracks by ${artistName} to ${newGenre}`);
        } catch (err) {
            console.error('Error assigning genre by artist:', err);
            alert('Failed to assign genre. Please try again.');
        }
    };

    const handleTrackClick = (track, genre) => {
        setSelectedTrack(track);
        setSelectedTrackGenre(genre);
        setShowTrackModal(true);
    };

    if (isLoading) {
        return (
            <div className="loading-message">
                <h2>Analyzing your playlist...</h2>
                <p>This may take a moment while we categorize tracks by genre.</p>
            </div>
        );
    }

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
    const availableGenres = genreEntries
        .filter(([genre]) => genre !== 'unknown')
        .map(([genre]) => genre);
        
    return (
        <div className="container">

            <header className="sort-header">
                <h1>Tracks by Genre</h1>
                <p className="subtitle">
                    Found {genreEntries.length} genres with {Object.values(genreGroups).flat().length} total tracks
                </p>
                <div className="header-actions">
                    <button 
                        className={`combine-btn ${combineMode ? 'active' : ''}`}
                        onClick={() => {
                            setCombineMode(!combineMode);
                            setSelectedGenres([]);
                        }}
                    >
                        {combineMode ? 'Cancel Combine' : 'Combine Genres'}
                    </button>
                    {combineMode && selectedGenres.length >= 2 && (
                        <button className="confirm-combine-btn" onClick={combineGenres}>
                            Combine {selectedGenres.length} Genres
                        </button>
                    )}
                    <button className="back-btn" onClick={() => navigate('/playlists')}>
                        ← Back to Playlists
                    </button>
                </div>
            </header>

            <div className="genre-grid">
                {genreEntries.map(([genre, tracks]) => (
                    <div 
                        key={genre} 
                        className={`genre-card ${combineMode && selectedGenres.includes(genre) ? 'selected' : ''} ${combineMode && genre !== 'unknown' ? 'selectable' : ''}`}
                        onClick={() => combineMode && genre !== 'unknown' && toggleGenreSelection(genre)}
                    >
                        <div className="genre-card-header">
                            <h3>
                                {combineMode && genre !== 'unknown' && (
                                    <input 
                                        type="checkbox" 
                                        checked={selectedGenres.includes(genre)}
                                        readOnly
                                        className="genre-checkbox"
                                    />
                                )}
                                {genre === 'unknown' ? 'Uncategorized' : genre}
                            </h3>
                            <span className="track-count">{tracks.length} tracks</span>
                        </div>
                        
                        <div className="genre-card-body">
                            {genre === 'unknown' && (
                                <p className="uncategorized-info">
                                    These tracks don't have an assigned genre. Click on a track to assign it to an existing or new genre.
                                </p>
                            )}
                            <div className="tracks-scrollable">
                                {tracks.map((track, index) => (
                                    <div 
                                        key={index} 
                                        className="track-full-item clickable"
                                        onClick={(e) => {
                                            if (!combineMode) {
                                                e.stopPropagation();
                                                handleTrackClick(track, genre);
                                            }
                                        }}
                                    >
                                        {track.image && (
                                            <img 
                                                src={track.image} 
                                                alt={track.name}
                                                className="track-image"
                                            />
                                        )}
                                        <div className="track-info">
                                            <span className="track-name">{track.name}</span>
                                            <span className="track-artist">{track.artist}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="genre-card-actions">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        CreatePlaylist(genre);
                                    }}
                                    disabled={creatingPlaylist === genre || tracks.length === 0}
                                    className="create-playlist-btn"
                                >
                                    {creatingPlaylist === genre ? 'Creating...' : 'Create Playlist'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Track Action Modal */}
            {showTrackModal && selectedTrack && (
                <div className="modal-overlay" onClick={() => setShowTrackModal(false)}>
                    <div className="modal-content track-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="track-modal-header">
                            {selectedTrack.image && (             
                                <img 
                                    src={selectedTrack.image} 
                                    alt={selectedTrack.name}
                                    className="modal-track-image"
                                />
                            )}
                            <div className="modal-track-info">
                                <h3>{selectedTrack.name}</h3>
                                <p>{selectedTrack.artist}</p>
                            </div>
                        </div>
                        <div className="track-modal-actions">
                            <button
                                onClick={() => {
                                    setShowTrackModal(false);
                                    setShowGenreSelector(true);
                                }}
                                className="action-btn primary"
                            >
                                Assign This Track
                            </button>
                            <button
                                onClick={() => {
                                    setShowTrackModal(false);
                                    setShowArtistGenreSelector(true);
                                }}
                                className="action-btn secondary"
                            >
                                Assign All by {selectedTrack.artist}
                            </button>
                        </div>
                        <button className="cancel-btn" onClick={() => setShowTrackModal(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {/* Track Genre Selection Modal */}
            {showGenreSelector && selectedTrack && (
                <div className="modal-overlay" onClick={() => setShowGenreSelector(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Move "{selectedTrack.name}" to:</h3>
                        <div className="genre-buttons">
                            {availableGenres
                                .filter(genre => genre !== selectedTrackGenre)
                                .map((genre) => (
                                    <button
                                        key={genre}
                                        onClick={() => assignGenreToTrack(selectedTrack.uri, genre, selectedTrackGenre)}
                                        className="genre-option-btn"
                                    >
                                        {genre}
                                    </button>
                                ))}
                            <input
                                type="text"
                                placeholder="Or type a new genre..."
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        assignGenreToTrack(selectedTrack.uri, e.target.value.trim(), selectedTrackGenre);
                                    }
                                }}
                            />
                        </div>
                        <button className="cancel-btn" onClick={() => setShowGenreSelector(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Artist Genre Selection Modal */}
            {showArtistGenreSelector && selectedTrack && (
                <div className="modal-overlay" onClick={() => setShowArtistGenreSelector(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Move all tracks by "{selectedTrack.artist}" to:</h3>
                        <div className="genre-buttons">
                            {availableGenres
                                .filter(genre => genre !== selectedTrackGenre)
                                .map((genre) => (
                                    <button
                                        key={genre}
                                        onClick={() => assignGenreByArtist(selectedTrack.artist, genre, selectedTrackGenre)}
                                        className="genre-option-btn"
                                    >
                                        {genre}
                                    </button>
                                ))}
                            <input
                                type="text"
                                placeholder="Or type a new genre..."
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        assignGenreByArtist(selectedTrack.artist, e.target.value.trim(), selectedTrackGenre);
                                    }
                                }}
                            />
                        </div>
                        <button className="cancel-btn" onClick={() => setShowArtistGenreSelector(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}                                                                      
        </div>
    );
}

export default Sort;            