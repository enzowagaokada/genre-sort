from django.urls import path
from .views import (
    SpotifyCallbackView,
    SpotifyLoginView,
    IsAuthenticatedView,
    GetPlaylistsView,
    SortPlaylistByGenreView,
    CreateGenrePlaylistView,
    AssignGenreToTrackView,
    CombineGenresView,
    AssignGenreByArtistView,
)

urlpatterns = [
    path('login/', SpotifyLoginView.as_view(), name='spotify-login'),
    path('callback/', SpotifyCallbackView.as_view(), name='spotify-callback'),
    path('is-authenticated/', IsAuthenticatedView.as_view(), name='is-authenticated'),
    path('playlists/', GetPlaylistsView.as_view(), name='get-playlists'),
    path('sort-playlist/<str:playlist_id>/', SortPlaylistByGenreView.as_view(), name='sort-playlist'),
    path('create-playlist/', CreateGenrePlaylistView.as_view(), name='create-genre-playlist'),
    path('assign-genre/', AssignGenreToTrackView.as_view(), name='assign-genre'),
    path('combine-genres/', CombineGenresView.as_view(), name='combine_genres'),
    path('assign-genre-by-artist/', AssignGenreByArtistView.as_view(), name='assign-genre-by-artist')
]