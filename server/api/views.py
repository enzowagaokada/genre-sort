from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import redirect
from spotipy.oauth2 import SpotifyOAuth
import spotipy
import os
import time
from collections import defaultdict

SCOPE = "playlist-read-private playlist-modify-public playlist-modify-private"

REDIRECT_URI = os.environ.get('REDIRECT_URI')
CLIENT_URL = os.environ.get('CLIENT_URL')

def get_spotify_oauth():
    return SpotifyOAuth(
        client_id=os.environ.get('SPOTIFY_CLIENT_ID'),
        client_secret=os.environ.get('SPOTIFY_CLIENT_SECRET'),
        redirect_uri=REDIRECT_URI,
        scope=SCOPE
    )

class SpotifyLoginView(APIView):
    def get(self, request, *args, **kwargs):
        auth_url = get_spotify_oauth().get_authorize_url()
        return redirect(auth_url)
    
class SpotifyCallbackView(APIView):
    def get(self, request, *args, **kwargs):
        oauth = get_spotify_oauth()
        code = request.GET.get('code')
        if code:
            token_info = oauth.get_access_token(code)
            #store token info in session
            request.session['spotify_token_info'] = token_info
            return redirect(CLIENT_URL)
        else:
            return Response({"error": "Authorization code not found."}, status=400)

class IsAuthenticatedView(APIView):
    def get(self, request, *args, **kwargs):
        token_info = request.session.get('spotify_token_info', None)

        if not token_info:
            return Response({'status': False})
        # Validate token
        oauth = get_spotify_oauth()
        token_info = oauth.validate_token(token_info)

        if token_info:
            request.session['spotify_token_info'] = token_info
            # Get user's name and profile picture
            sp = spotipy.Spotify(auth=token_info['access_token'])
            user_info = sp.current_user()
            user_data = {
                'name': user_info.get('display_name', 'User'),
                'image_url': user_info['images'][0]['url'] if user_info.get('images') else None
            }
            return Response({'status': True, 'user': user_data})
        else:
            return Response({'status': False})

class GetPlaylistsView(APIView):
    def get(self, request, *args, **kwargs):
        # Get spotify token
        token_info = request.session.get('spotify_token_info', None)

        # If token doesn't exist
        if not token_info:
            return Response({'error': 'Token expired'}, status=401)
        # Spotify object with access token as parameter
        sp = spotipy.Spotify(auth=token_info['access_token'])

        playlists = []
        results = sp.current_user_playlists(limit=50)

        # Adding all playlists into a list with id, name, track count, and image url all tracked
        while results:
            for playlist in results['items']:
                playlists.append({
                    'id': playlist['id'],
                    'name': playlist['name'],
                    'track_count': playlist['tracks']['total'],
                    'image_url': playlist['images'][0]['url'] if playlist['images'] else None
                })
            
            # WHAT IS THE POINT OF THIS ??
            if results['next']:
                results = sp.next(results)
            else:
                results = None
        
        return Response({'playlists': playlists})

class SortPlaylistByGenreView(APIView):
    def get(self, request, playlist_id, *args, **kwargs):
        # Get Spotify token
        token_info = request.session.get('spotify_token_info', None)
        
        # If no token, throw error
        if not token_info:
            return Response({'error': 'Not authenticated'}, status=401)
        
        sp = spotipy.Spotify(auth=token_info['access_token'])
        
        # Get all tracks from the playlist
        tracks = []
        results = sp.playlist_tracks(playlist_id)
        
        while results:
            for item in results['items']:
                if item['track'] and item['track']['artists']:
                    tracks.append(item['track'])
            
            if results['next']:
                results = sp.next(results)
            else:
                results = None

        # Sort tracks by genre based on artist genres
        genre_groups = defaultdict(list)
        
        # Get unique artist IDs to avoid duplicate API calls
        artist_ids = list(set(track['artists'][0]['id'] for track in tracks if track['artists']))
        # Fetch artists in batches (Spotify allows up to 50 artists per request)
        artist_genres_map = {}
        batch_size = 50
        
        for i in range(0, len(artist_ids), batch_size):
            batch = artist_ids[i:i + batch_size]
            try:
                artists = sp.artists(batch)['artists']
                for artist in artists:
                    artist_genres_map[artist['id']] = artist.get('genres', [])

                # Add a small delay to avoid rate limiting
                time.sleep(0.1)
            except Exception as e:
                print(f"Error fetching artists batch: {e}")
                continue
        
        # Now group tracks by genre
        for track in tracks:
            if not track['artists']:
                continue
            
            artist_id = track['artists'][0]['id']
            artist_genres = artist_genres_map.get(artist_id, [])
            
            track_info = {
                'name': track['name'],
                'artist': track['artists'][0]['name'],
                'uri': track['uri'],
                'image' : track['album']['images'][0]['url'] if track['album'].get('images') else None
            }

            #If artist does not have a genre, add to unknown
            if not artist_genres:
                genre_groups['unknown'].append(track_info)
            else:
                #Add track to the first genre the artist belongs to
                primary_genre = artist_genres[0]
                genre_groups[primary_genre].append(track_info)
                # for genre in artist_genres:
                #     genre_groups[genre].append(track_info)
            
        # Convert defaultdict to regular dict for JSON serialization
        genre_groups = dict(genre_groups)
        
        # Store the sorted tracks in session for later use
        request.session[f'sorted_tracks_{playlist_id}'] = genre_groups
        
        return Response({'genre_groups': genre_groups})

class CreateGenrePlaylistView(APIView):
    def post(self, request, *args, **kwargs):
        token_info = request.session.get('spotify_token_info', None)
        
        if not token_info:
            return Response({'error': 'Not authenticated'}, status=401)
        
        sp = spotipy.Spotify(auth=token_info['access_token'])
        
        playlist_id = request.data.get('playlist_id')
        genre = request.data.get('genre')
        
        if not playlist_id or not genre:
            return Response({'error': 'Missing playlist_id or genre'}, status=400)
        
        # Get the sorted tracks from session
        sorted_tracks = request.session.get(f'sorted_tracks_{playlist_id}', {})
        
        if genre not in sorted_tracks:
            return Response({'error': 'Genre not found'}, status=404)
        
        tracks = sorted_tracks[genre]
        track_uris = [track['uri'] for track in tracks]
        
        # Get current user
        user = sp.current_user()
        user_id = user['id']
        
        # Create new playlist
        playlist_name = f"{genre.title()} Mix"
        new_playlist = sp.user_playlist_create(
            user_id,
            playlist_name,
            public=False,
            description=f"Auto-generated playlist with {genre} tracks"
        )

        # Add tracks to the new playlist (Spotify limits to 100 tracks per request)
        for i in range(0, len(track_uris), 100):
            sp.playlist_add_items(new_playlist['id'], track_uris[i:i+100])
        
        return Response({
            'success': True,
            'playlist_name': playlist_name,
            'playlist_id': new_playlist['id'],
            'track_count': len(track_uris)
        })

class AssignGenreToTrackView(APIView):
    def post(self, request, *args, **kwargs):
        """
        Assign a genre to a specific track, moving it from its current genre
        """
        token_info = request.session.get('spotify_token_info', None)
        
        if not token_info:
            return Response({'error': 'Not authenticated'}, status=401)
        
        playlist_id = request.data.get('playlist_id')
        track_uri = request.data.get('track_uri')
        new_genre = request.data.get('genre')
        current_genre = request.data.get('current_genre')  # Add this
        
        if not all([playlist_id, track_uri, new_genre]):
            return Response({'error': 'Missing required fields'}, status=400)
        
        # Get the sorted tracks from session
        sorted_tracks = request.session.get(f'sorted_tracks_{playlist_id}', {})
        
        if not sorted_tracks:
            return Response({'error': 'No sorted tracks found'}, status=404)
        
        # Find and remove the track from its current genre
        track_to_move = None
        if current_genre and current_genre in sorted_tracks:
            for i, track in enumerate(sorted_tracks[current_genre]):
                if track['uri'] == track_uri:
                    track_to_move = sorted_tracks[current_genre].pop(i)
                    break
        
        # If not found in specified genre, search all genres
        if not track_to_move:
            for genre, tracks in sorted_tracks.items():
                for i, track in enumerate(tracks):
                    if track['uri'] == track_uri:
                        track_to_move = tracks.pop(i)
                        break
                if track_to_move:
                    break
        
        if not track_to_move:
            return Response({'error': 'Track not found'}, status=404)
        
        # Add to new genre
        if new_genre not in sorted_tracks:
            sorted_tracks[new_genre] = []
        
        # Check for duplicates
        if not any(track['uri'] == track_uri for track in sorted_tracks[new_genre]):
            sorted_tracks[new_genre].append(track_to_move)
        
        # Update session
        request.session[f'sorted_tracks_{playlist_id}'] = sorted_tracks
        request.session.modified = True
        
        return Response({
            'success': True,
            'message': f'Track moved to {new_genre}',
            'genre_groups': sorted_tracks
        })
    
class CombineGenresView(APIView):
    def post(self, request, *args, **kwargs):
        """
        Combine multiple genres into one
        """
        token_info = request.session.get('spotify_token_info', None)
        
        if not token_info:
            return Response({'error': 'Not authenticated'}, status=401)
        
        playlist_id = request.data.get('playlist_id')
        genres_to_combine = request.data.get('genres', [])
        
        if not playlist_id:
            return Response({'error': 'Missing playlist_id'}, status=400)
        
        if len(genres_to_combine) < 2:
            return Response({'error': 'Need at least 2 genres to combine'}, status=400)
        
        # Get stored genre data from session
        session_key = f'sorted_tracks_{playlist_id}'
        sorted_tracks = request.session.get(session_key, {})
        
        if not sorted_tracks:
            return Response({'error': 'No genre data found'}, status=404)
        
        # Combine tracks from selected genres
        seen_uris = set()
        combined_tracks = []

        for genre in genres_to_combine:
            if genre in sorted_tracks:
                for track in sorted_tracks[genre]:
                    # Only add track if we haven't seen this URI before
                    if track['uri'] not in seen_uris:
                        combined_tracks.append(track)
                        seen_uris.add(track['uri'])
                # Remove the old genre
                del sorted_tracks[genre]
        
        if not combined_tracks:
            return Response({'error': 'No tracks found in selected genres'}, status=404)
        
        # Create new combined genre name
        combined_genre_name = ' + '.join(sorted(genres_to_combine))
        
        # Add combined genre with all tracks
        sorted_tracks[combined_genre_name] = combined_tracks
        
        # Update session
        request.session[session_key] = sorted_tracks
        request.session.modified = True
        
        return Response({
            'success': True,
            'genre_groups': sorted_tracks,
            'combined_genre_name': combined_genre_name,
            'total_tracks': len(combined_tracks),
            'duplicates_removed': sum(len(sorted_tracks.get(g, [])) for g in genres_to_combine) - len(combined_tracks)
        })

class AssignGenreByArtistView(APIView):
    def post(self, request, *args, **kwargs):
        """
        Assign a genre to all tracks by a specific artist from any genre
        """
        token_info = request.session.get('spotify_token_info', None)
        
        if not token_info:
            return Response({'error': 'Not authenticated'}, status=401)
        
        playlist_id = request.data.get('playlist_id')
        artist_name = request.data.get('artist_name')
        new_genre = request.data.get('genre')
        current_genre = request.data.get('current_genre')  # Optional: for optimization
        
        if not all([playlist_id, artist_name, new_genre]):
            return Response({'error': 'Missing required fields'}, status=400)
        
        # Get the sorted tracks from session
        sorted_tracks = request.session.get(f'sorted_tracks_{playlist_id}', {})
        
        if not sorted_tracks:
            return Response({'error': 'No tracks found'}, status=404)
        
        tracks_moved = 0
        
        # Search through all genres (or just the current one if specified)
        genres_to_search = [current_genre] if current_genre and current_genre in sorted_tracks else sorted_tracks.keys()
        
        for genre in list(genres_to_search):
            if genre == new_genre:  # Skip the target genre
                continue
                
            if genre not in sorted_tracks:
                continue
                
            tracks_to_move = []
            remaining_tracks = []
            
            for track in sorted_tracks[genre]:
                if track['artist'].lower() == artist_name.lower():
                    tracks_to_move.append(track)
                else:
                    remaining_tracks.append(track)
            
            # Update the current genre
            sorted_tracks[genre] = remaining_tracks
            
            # Add tracks to new genre
            if new_genre not in sorted_tracks:
                sorted_tracks[new_genre] = []
            
            # Check for duplicates before adding
            existing_uris = {track['uri'] for track in sorted_tracks[new_genre]}
            for track in tracks_to_move:
                if track['uri'] not in existing_uris:
                    sorted_tracks[new_genre].append(track)
                    existing_uris.add(track['uri'])
                    tracks_moved += 1
        
        if tracks_moved == 0:
            return Response({'error': f'No tracks by {artist_name} found'}, status=404)
        
        # Update session
        request.session[f'sorted_tracks_{playlist_id}'] = sorted_tracks
        request.session.modified = True
        
        return Response({
            'success': True,
            'message': f'Moved {tracks_moved} tracks by {artist_name} to {new_genre}',
            'tracks_moved': tracks_moved,
            'genre_groups': sorted_tracks
        })            