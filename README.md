# Details
The official Plex-LastFM intergration doesn't support displaying what your currently playing, meaning you wait for a track.scrobble (>50% played) before it's available for things like .fm bot. This API supports the track.updateNowPlaying, meaning .fm bot can pull what you're listening to instantly!

# Setup
## Docker compose file
```
services:
  plexfm:
    container_name: plexfm
    image: ghcr.io/xiliourt/plexfm:latest
    environment:
      - LAST_FM_API_KEY=<API Key>
      - LAST_FM_SHARED_SECRET=<Shared secret>
      - LAST_FM_SESSION_KEY=<Session Key (see steps below)
      - WEBHOOK_API_KEY=<Just a random string added to the url as apiKey param for security>
```

This can then be accessed from the plex container (assuming same network) via `http://plexfm/webhook?apiKey=<WEBHOOK_API_KEY>`.

## Setup steps 
### Requires below env variables (change in docker-compose.yml code above)
- LAST_FM_API_KEY=<API_KEY>
- LAST_FM_SHARED_SECRET=<SHARED_SECRET>
- LAST_FM_SESSION_KEY=<SESSION_KEY *(see steps below)*>
- WEBHOOK_API_KEY=<A random string appended to the webhook URL - The most security I could be bothered adding to the API as mine runs locally>
  - This will be your webhook url, ie enter http://localhost:3000/webhook?apiKey=<WEBHOOK_API_KEY> into plex *(you'll need to add exposing port 3000 to docker compose)*
  - If plex is on the same docker network, you can use http://plexfm:3000/webhook?apiKey=<WEBHOOK_API_KEY>.

### LastFM Session Key Steps:
- Create an app at https://www.last.fm/api/account/create
  - Change **LAST_FM_API_KEY** to the created API Key
  - Change **LAST_FM_SHARED_SECRET** to the created Shared Secret
- Use the generator below to create a session token (requires authenticating your LastFM account with the API 'app' you just created above)
  - Either open http://(ip):3000 or on Gitpages [here](https://xiliourt.github.io/PlexFMDocker/) *(Git Actions simply pushes the 'public' dir to pages)*
    - Enter the API_KEY and SHARED_SECRET
    - Authenticate your LastFM account via the URL it provides
    - Once authenticated, click 'Get Session Key'
  - Change **LAST_FM_SESSION_KEY** to the session key gained above
- Change **WEBHOOK_API_KEY** to a random string
  - Your webhook url will be *(url)*/webhook?apiKey=<WEBHOOK_API_KEY>. *(where <WEBHOOK_API_KEY> is the random string you set)*
    - If on the same docker network as plex: `http://plexfm:3000/webhook?apiKey=<WEBHOOK_API_KEY>`
    - If on a different network but same host `http://localhost:3000/webhook?apiKey=<WEBHOOK_API_KEY>` *(You'll need to add exposing port 3000 to docker-compose.yml)*
    - **(NOT RECOMMENDED)** if on a different host and/or network `http://(IPAddresss):3000?apiKey=<WEBHOOK_API_KEY>` *(You'll need to add exposing port 3000 to docker-compose.yml and potentially firewall rules)*


