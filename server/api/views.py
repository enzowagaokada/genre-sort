from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import redirect
from spotipy.oauth2 import SpotifyOAuth
import os

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


