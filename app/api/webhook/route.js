import { NextResponse } from "next/server";
import md5 from "crypto-js/md5";

// --- Configuration ---
const {
    LAST_FM_API_KEY,
    LAST_FM_SHARED_SECRET,
    LAST_FM_SESSION_KEY,
    WEBHOOK_API_KEY,
} = process.env;

const LAST_FM_API_URL = "https://ws.audioscrobbler.com/2.0/";
const RETRYABLE_LAST_FM_ERRORS = [11, 16]; // Specific Last.fm server errors
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

// --- Helper Functions ---

/**
 * Creates a standardized JSON response.
 * @param {number} status - The HTTP status code.
 * @param {object | string} body - The response body.
 * @returns {NextResponse}
 */
function createResponse(status, body = null) {
    if (!body) { return new NextResponse(null, { "status": status }); }
    return NextResponse.json(body, { "status": status })
}

/**
 * Pauses execution for a given number of milliseconds.
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Last.fm API Logic ---

/**
 * Generates a securely signed payload for a Last.fm API request.
 * @param {object} params - The parameters for the API call.
 * @returns {URLSearchParams} A URLSearchParams object containing the signed payload.
 */
function generateSecurePayload(params) {
    // LastFM's required format - Sorted params, joint, MD% hashed with secret
    const signatureString = Object.keys(params).sort().map((key) => key + params[key]).join("");
    const signature = md5(signatureString + LAST_FM_SHARED_SECRET).toString();

    return new URLSearchParams({
        ...params,
        api_sig: signature,
        format: "json",
    });
}

/**
 * Sends a request to the Last.fm API with automatic retries on failure.
 * @param {string} method - The Last.fm API method to call.
 * @param {object} trackInfo - Contains track, artist, and album.
 * @param {string} trackInfo.track - The title of the track.
 * @param {string} trackInfo.artist - The name of the artist.
 * @param {string} trackInfo.album - The name of the album.
 * @param {number} [attempt=1] - The current retry attempt number.
 * @returns {Promise<object>} A promise that resolves with the JSON response from the API.
 */
async function sendLastFmRequest(method, { track, artist, album }, attempt = 1) {
    const params = {
        method,
        artist,
        track,
        album,
        timestamp: Math.floor(Date.now() / 1000),
        api_key: LAST_FM_API_KEY,
        sk: LAST_FM_SESSION_KEY,
    };

    const payload = generateSecurePayload(params);

    try {
        const response = await fetch(LAST_FM_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload.toString(),
        });

        if (!response.ok) {
            console.warn(`Last.fm API returned a non-OK status: ${response.status}`, await response.text());
        }

        const jsonResponse = await response.json();

        // Handle Last.fm-specific errors that are retryable
        if (RETRYABLE_LAST_FM_ERRORS.includes(jsonResponse.error)) {
            if (attempt < MAX_RETRIES) {
                console.warn(`Last.fm Error (Code: ${jsonResponse.error}). Retrying attempt ${attempt + 1}/${MAX_RETRIES} for ${method} in ${RETRY_DELAY_MS}ms...`);
                await sleep(RETRY_DELAY_MS);
                return sendLastFmRequest(method, { track, artist, album }, attempt + 1);
            } else {
                throw new Error(`Max retries reached for Last.fm API. Last error: ${jsonResponse.message}`);
            }
        }

        // Handle other Last.fm errors
        if (jsonResponse.error) {
           throw new Error(`Last.fm API Error: ${jsonResponse.message} (Code: ${jsonResponse.error})`);
        }

        // Log if scrobbles were ignored by the API
        if (jsonResponse.scrobbles?.["@attr"]?.ignored > 0) {
            console.warn("Last.fm ignored scrobbles. Details:", jsonResponse.scrobbles);
        }

        console.log(`Last.fm method '${method}' successful for: ${artist} - ${track}`);
        return jsonResponse;

    } catch (error) {
        // Catches fetch errors, JSON parsing errors, and thrown errors from retry logic
        console.error(`Error during Last.fm request for method '${method}':`, error.message);
        throw error; // Re-throw to be caught by the main handler
    }
}

/**
 * Handles incoming POST requests from a webhook.
 * @param {Request} request - The incoming Plex Webhook Request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request, { params }) {
    // Authenticate the request
    const apiKey = request.nextUrl.searchParams.get("apiKey");
    if (apiKey !== WEBHOOK_API_KEY) { return createResponse(401, { error: "Unauthorized" }); console.warn("Connection attempted with API key: ", apiKey);}

    try {
        // Parse and validate the incoming payload
        const formData = await request.formData()
        const payload = formData.get('payload')
        const jsonPayload = JSON.parse(payload)

        // Replaces if statement - if this throws an error, payload is missing or melformed.
        const Metadata = jsonPayload.Metadata;
        const event = jsonPayload.event;

        // We only care about music tracks
        if (Metadata.type !== "track") { return createResponse(204); }

        // Map Plex metadata to Last.fm parameters
        const trackInfo = {
            track: Metadata.title,
            artist: Metadata.grandparentTitle, // In Plex, grandparentTitle is the artist
            album: Metadata.parentTitle,       // parentTitle is the album
        };

        // Dispatch action based on the event type
        switch (event) {
            case "media.play":
            case "media.resume":
                await sendLastFmRequest("track.updateNowPlaying", trackInfo);
                break;

            case "media.scrobble":
                await sendLastFmRequest("track.scrobble", trackInfo);
                break;

            case "media.pause":
            case "media.stop":
                return createResponse(204);

            default:
                console.warn(`Unhandled Plex event type received: ${event}`);
                return createResponse(204, { message: `Unhandled event type: ${event}` });
        }

        return createResponse(200, { received: true, event: event });
        
    // Catch any errors unhandled by sendLastFmRequest
    } catch (error) {
        console.error("Failed to process Plex webhook: ", error.message || error);
        return createResponse(500, { error: "Internal Server Error" });
    }
}

// Handles GET requests
export async function GET() { return createResponse(405, { error: "Method Not Allowed" }); }
