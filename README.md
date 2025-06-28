# Details
The official Plex-LastFM intergration doesn't support displaying what your currently playing, meaning you wait for a track.scrobble (>50% played) before it's available for things like .fm bot. This API supports the track.updateNowPlaying, meaning .fm bot can pull what you're listening to instantly!

# Setup
## Docker compose file
```
services:
  plexfm:
    container_name: plexfm
    buiid .
    ports:
      - 3000:3000
    environment:
      - LAST_FM_API_KEY=<API Key>
      - LAST_FM_SHARED_SECRET=<Shared secret>
      - LAST_FM_SESSION_KEY=<Session Key (see steps below)
      - WEBHOOK_API_KEY=<Just a random string added to the url as apiKey param for security>
```

## Note
It can be used on a docker network, ie
```
networks:
  - backnet
```

Then accessed from the plex container (assuming same network) via `http://plexfm/webhook?apiKey=<WEBHOOK_API_KEY>`

## Setup steps 
### Requires below env variables (change in docker-compose.yml code above)
- LAST_FM_API_KEY=<API Key>
- LAST_FM_SHARED_SECRET=<Shared secret>
- LAST_FM_SESSION_KEY=<Session Key (see steps below)
- WEBHOOK_API_KEY=<A random string to append to requests as a param>
  - This will be your webhook url, ie enter http://localhost:3000/webhook?apiKey=<WEBHOOK_API_KEY> into plex
  - If plex is on the same docker network, you can use http://plexfm:3000/webhook?apiKey=<WEBHOOK_API_KEY> and remove exposing port 3000.

### LastFM Session Key Steps:
- Create an app at https://www.last.fm/api/account/create
  - Change API_KEY in the script to the created API_KEY (also add to **LAST_FM_API_KEY**)
  - Change SHARED_KEY in the script to the SHARED_KEY (also add to **LAST_FM_SHARED_SECRET**)
- Run the script
- When prompted, open the URL and authenticate (you're giving your own API app access to your account)
- Press Enter on the bash script
- Add the outputted session key **env.LAST_FM_SK**

```
#!/bin/bash
API_KEY="YOUR_LASTFM_API_KEY"        # <--- REPLACE THIS
SHARED_SECRET="YOUR_LASTFM_SHARED_SECRET" # <--- REPLACE THIS

API_URL="http://ws.audioscrobbler.com/2.0/"

# --- Functions ---
# Function to calculate MD5 hash, cross-platform compatible
calculate_md5() {
    local input_string="$1"
    # Try md5sum (Linux)
    if command -v md5sum &> /dev/null; then
        echo -n "$input_string" | md5sum | awk '{print $1}'
    # Try openssl md5 (macOS/BSD)
    elif command -v openssl &> /dev/null; then
        echo -n "$input_string" | openssl md5 | awk '{print $NF}'
    else
        echo "Error: Neither 'md5sum' nor 'openssl' found. Cannot calculate MD5 signature." >&2
        exit 1
    fi
}

echo "--- Last.fm Session Key Acquisition ---"
echo "Step 1: Requesting a temporary authentication token..."
TOKEN_RESPONSE=$(curl -s -X GET "$API_URL" \
    -d "method=auth.getToken" \
    -d "api_key=$API_KEY" \
    -d "format=json")

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token') 
AUTH_URL="http://www.last.fm/api/auth/?api_key=$API_KEY&token=$TOKEN"

echo ""
echo "Step 2: User authorization required."
echo "Please open the following URL in your web browser, log in to Last.fm (if prompted),"
echo "and grant access to your application. Then, return here and press Enter."
echo ""
echo "URL: $AUTH_URL"
echo ""
read -p "Press Enter to continue after authorization..."

echo ""
echo "Step 3: Request the session key using auth.getSession..."
SIGNATURE_STRING="api_key${API_KEY}methodauth.getSessiontoken${TOKEN}${SHARED_SECRET}"
API_SIG=$(calculate_md5 "$SIGNATURE_STRING")

SESSION_RESPONSE=$(curl -s -X POST "$API_URL" \
    -d "method=auth.getSession" \
    -d "api_key=$API_KEY" \
    -d "token=$TOKEN" \
    -d "api_sig=$API_SIG" \
    -d "format=json")

echo "--- Success! Permanent Last.fm Session Key Obtained ---"
echo ""Session Key: $(echo "$SESSION_RESPONSE" | jq -r '.session.key')"
```

If I get bored, I'll make the bash script a docker startup script so it sets up on first run... Idk

