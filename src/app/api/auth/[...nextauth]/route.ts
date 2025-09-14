import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
const authHandler = NextAuth({
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'user-read-email playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private'
                }
            }
        })
    ],
    callbacks: {
        async jwt({token, account}) {
            if (account) {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
            }
            return token
        },
        async session({session, token}) {
            //send properties to the client
            session.accessToken = token.accessToken
            return session
        }
    }
})

export {authHandler as GET, authHandler as POST}