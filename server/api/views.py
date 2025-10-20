from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import redirect
from spotipy.oauth2 import SpotifyOAuth
import spotipy
import os
import time
from collections import defaultdict

SCOPE = "playlist-read-private playlist-modify-public playlist-modify-private"

REDIRECT_URI = "http://127.0.0.1:8000/api/callback/"

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
            return redirect('http://127.0.0.1:5173')
        else:
            return Response({"error": "Authorization code not found."}, status=400)

class IsAuthenticatedView(APIView):
    def get(self, request, *args, **kwargs):
        token_info = request.session.get('spotify_token_info', None)

        if not token_info:
            return Response({'status': False})
        #validate token
        oauth = get_spotify_oauth()
        token_info = oauth.validate_token(token_info)

        if token_info:
            request.session['spotify_token_info'] = token_info
            return Response({'status': True})
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
                    if 'polo' in artist['name'].lower():
                        print(f"DEBUG - Artist: {artist['name']}")
                        print(f"DEBUG - Artist ID: {artist['id']}")
                        print(f"DEBUG - Genres: {artist.get('genres', [])}")
                        print(f"DEBUG - Full artist data: {artist}")
                        print("---")
                
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
                'uri': track['uri']
            }

            #If artist does not have a genre, add to unknown
            if not artist_genres:
                genre_groups['unknown'].append(track_info)
            else:
                #Add track to each genre the artist belongs to
                for genre in artist_genres:
                    genre_groups[genre].append(track_info)
            
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

