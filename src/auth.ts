const { google } = require('googleapis');
const fs = require('fs');

const CREDENTIALS_PATH = 'credentials.json';
const TOKEN_PATH = 'tokens.json';

// Load Google OAuth2 credentials from file
function loadCredentials() {
  if (fs.existsSync(CREDENTIALS_PATH)) {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  } else {
    throw new Error('Credentials file not found.');
  }
}

// Create an OAuth2 client with the loaded credentials
function createOAuth2Client() {
  const credentials = loadCredentials();
  const { client_id, client_secret, redirect_uris } = credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

const oAuth2Client = createOAuth2Client();

// Load previously saved token if available
function loadToken() {
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(tokens);
    console.log('Token loaded from tokens.json');
  } else {
    console.log('No token found. Please authorize the app.');
  }
}

// Save tokens to a file
function saveToken(tokens: any) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Tokens saved to tokens.json');
}

// Generate the URL for OAuth2 authorization
function getAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly'
  ];
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Ensure user consent is always requested
  });
}

// Exchange authorization code for tokens
async function getTokens(code: any) {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('Received tokens:', tokens);
    oAuth2Client.setCredentials(tokens);
    saveToken(tokens);
  } catch (error) {
    console.error('Error while exchanging code for tokens:', error);
  }
}

export {
  oAuth2Client,
  getAuthUrl,
  getTokens,
  loadToken
};
