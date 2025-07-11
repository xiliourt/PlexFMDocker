# Details
The official Plex-LastFM intergration doesn't support displaying what your currently playing, meaning you wait for a track.scrobble (>50% played) before it's available for things like .fm bot. This API supports the track.updateNowPlaying, meaning .fm bot can pull what you're listening to instantly!

# Docker compose file
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
### Gathering Environment Variables
Create an app at [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create):
  - Change **LAST_FM_API_KEY** to the created API Key
  - Change **LAST_FM_SHARED_SECRET** to the created Shared Secret

Create a session key by following the prompts [here](https://xiliourt.github.io/PlexFMDocker/) *(it's identical to http://(ip):3000 if you want to use it locally)*
- Change **LAST_FM_SESSION_KEY** to the session key generated

Change **WEBHOOK_API_KEY** to a random string
- Your webhook url will be *(url)*/webhook?apiKey=<WEBHOOK_API_KEY>. *(where <WEBHOOK_API_KEY> is the random string you set)*

### Example Webhook URLs:
- **(RECOMMENDED)** If on the same docker network as plex: `http://plexfm:3000/webhook?apiKey=<WEBHOOK_API_KEY>`
- **(NOT RECOMMENDED)** If on a different docker network but same host `http://127.0.0.1:3000/webhook?apiKey=<WEBHOOK_API_KEY>`
  - *(You'll need to add port 3000:3000 to docker-compose.yml. The webhook may be exposed further than you intend.)*
- **(STRONGLY NOT RECOMMENDED)** if on a different host and/or network `http://(IPAddresss):3000?apiKey=<WEBHOOK_API_KEY>`
  - *(You'll need to add port 3000:3000 to docker-compose.yml and firewall rules. The webhook **will** be exposed to the open internet.)*

