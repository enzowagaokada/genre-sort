# Genre Sort for Spotify

A web application to organize your Spotify playlists by sorting their tracks into genres. Built with React and Django REST API.

I was really annoyed at my huge playlist so I made this.

## Features

-   **Spotify Login**: Securely log in with your Spotify account.
-   **Playlist Sorting**: Select any of your playlists to have its tracks automatically sorted into genre groups.
-   **Genre Organization**: Easily move tracks to different genres, combine genres, or create new ones.
-   **Create New Playlists**: Export any genre group into a new, clean playlist on your Spotify account.

## Tech Stack

-   **Frontend**: React, Vite
-   **Backend**: Django, Django REST Framework
-   **API**: Spotify Web API

## Note
A track's data does not contain a genre, therefore, I assigned each track a genre by the genres assigned to that track's artist by Spotify. As a result, genre matching for some songs may be inaccurate due to an artist's discography across multiple genres.

Some artists in the API don't have any assigned genres, so I have put these certain tracks in the **"Uncategorized"** playlist.
From there, you can add these songs into an existing genre playlist or add it to a new one.
