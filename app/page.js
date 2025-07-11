import { useState, useEffect } from 'react';

// --- Helper: Last.fm API Client ---
// A simple client to interact with the Last.fm API.
const lastFmApi = {
  baseUrl: 'https://ws.audioscrobbler.com/2.0/',
  
  // Fetches a temporary authentication token.
  async getToken(apiKey) {
    const params = new URLSearchParams({
      method: 'auth.getToken',
      api_key: apiKey,
      format: 'json',
    });
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`Last.fm API Error: ${data.message}`);
    }
    return data.token;
  },

  // Fetches the permanent session key after user authorization.
  async getSession(apiKey, token, apiSig) {
    const params = new URLSearchParams({
      method: 'auth.getSession',
      api_key: apiKey,
      token: token,
      api_sig: apiSig,
      format: 'json',
    });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
     if (data.error) {
      throw new Error(`Last.fm API Error: ${data.message}`);
    }
    return data.session.key;
  }
};

// --- Main Page Component ---
export default function LastFmAuthPage() {
  // --- State Management ---
  const [apiKey, setApiKey] = useState('');
  const [sharedSecret, setSharedSecret] = useState('');
  const [token, setToken] = useState(null);
  const [authUrl, setAuthUrl] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Effects ---
  useEffect(() => {
    // Set the document title
    document.title = "Last.fm Session Key Generator";

    // Create a script element for CryptoJS to handle MD5 hashing
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js";
    script.async = true;
    
    // Append the script to the document head
    document.head.appendChild(script);

    // Cleanup function to remove the script when the component unmounts
    return () => {
        // Check if the script is still in the head before attempting to remove it
        if (document.head.contains(script)) {
             document.head.removeChild(script);
        }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  /**
   * Step 1: Get a request token from the Last.fm API.
   * This token is used to build the authorization URL.
   */
  const handleGetAuthLink = async () => {
    if (!apiKey) {
      setError('Please enter your API Key.');
      return;
    }
    setIsLoading(true);
    setError('');
    setAuthUrl('');
    setSessionKey('');

    try {
      const fetchedToken = await lastFmApi.getToken(apiKey);
      setToken(fetchedToken);
      setAuthUrl(`https://www.last.fm/api/auth/?api_key=${apiKey}&token=${fetchedToken}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Step 2: Use the authorized token to get a permanent session key.
   * This requires an MD5 signature of the API call parameters.
   */
  const handleGetSessionKey = async () => {
    if (!sharedSecret) {
      setError('Please enter your Shared Secret to generate the signature.');
      return;
    }
    // Ensure CryptoJS is loaded from the CDN script before using it
    if (typeof CryptoJS === 'undefined') {
        setError('CryptoJS library not loaded. Please check your internet connection and try again.');
        return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Create the signature string as per Last.fm documentation.
      const signatureString = `api_key${apiKey}methodauth.getSessiontoken${token}${sharedSecret}`;
      
      // Calculate the MD5 hash.
      const apiSig = CryptoJS.MD5(signatureString).toString();

      const fetchedSessionKey = await lastFmApi.getSession(apiKey, token, apiSig);
      setSessionKey(fetchedSessionKey);

    } catch (err) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // --- Render ---
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen p-2 sm:p-4 bg-slate-900 text-white bg-[image:linear-gradient(hsla(0,0%,100%,.05)_1px,transparent_0),linear-gradient(90deg,hsla(0,0%,100%,.05)_1px,transparent_0)] bg-[size:50px_50px] bg-center">
        <header className="text-center mb-6 md:mb-8"><h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300 py-2">Last.fm Session Key Generator</h1><p className="text-slate-400 mt-1 text-base md:text-lg">Autogenerate a permanent LastFM session key for your app.</p></header>
        <div className="bg-slate-800/60 p-3 md:p-4 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700/80 backdrop-blur-xl">
          {/* Step 1: API Credentials Input */}
            <h2 className="font-semibold text-slate-200 truncate">Step 1: Enter Your Credentials</h2>
            <div className="my-4">
              <label htmlFor="apiKey" className="block text-slate-400 mb-1 font-semibold">API Key</label>
              <input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your Last.fm API Key"
                className="w-full p-3 rounded-md border border-slate-600 bg-slate-700 text-slate-200 text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="sharedSecret" className="block text-slate-400 mb-1 font-semibold">Shared Secret</label>
              <input
                id="sharedSecret"
                type="password"
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
                placeholder="Your Last.fm Shared Secret"
                className="w-full p-3 rounded-md border border-slate-600 bg-slate-700 text-slate-200 text-base focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <button 
              onClick={handleGetAuthLink} 
              disabled={isLoading} 
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-sky-400/50 flex items-center justify-center transform active:scale-98 shadow-lg hover:shadow-sky-500/20"
            >
              {isLoading && !authUrl ? 'Generating...' : 'Generate Auth Link'}
            </button>

          {/* Step 2: User Authorization */}
          {authUrl && (
            <div className="mt-6 border-t border-slate-700 pt-6">
              <h2 className="text-sky-400 text-lg mb-4">Step 2: Authorize Application</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Click the link below to authorize this application with your Last.fm account.
                After granting access, return to this page.
              </p>
              <a href={authUrl} target="_blank" rel="noopener noreferrer" className="block text-center p-3 bg-blue-500 text-white no-underline rounded-md font-bold hover:bg-blue-600">
                Authorize on Last.fm
              </a>
            </div>
          )}

          {/* Step 3: Get Session Key */}
          {authUrl && (
             <div className="mt-6 border-t border-slate-700 pt-6">
                <h2 className="text-sky-400 text-lg mb-4">Step 3: Get Session Key</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                    Once you have authorized the app, click the button below.
                </p>
                <button 
                  onClick={handleGetSessionKey} 
                  disabled={isLoading} 
                  className="bg-red-600 text-white py-3 px-5 rounded-md text-base font-bold cursor-pointer w-full transition-colors duration-200 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isLoading && !sessionKey ? 'Fetching...' : 'Get Session Key'}
                </button>
             </div>
          )}

          {/* Display Error Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-md mt-5">
              <p className="text-red-400 m-0">{error}</p>
            </div>
          )}

          {/* Display Final Session Key */}
          {sessionKey && (
            <div className="mt-6 border-t border-slate-700 pt-6 bg-green-500/10 text-white p-6 rounded-lg text-center">
              <h2 className="text-green-400 text-lg mb-4">Success!</h2>
              <p className="text-slate-300 leading-relaxed mb-4">Your permanent session key is:</p>
              <input
                type="text"
                readOnly
                value={sessionKey}
                className="w-full p-3 rounded-md text-base bg-slate-800 text-green-300 text-center font-bold border-none"
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
