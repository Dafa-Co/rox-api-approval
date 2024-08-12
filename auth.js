const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load OAuth2 credentials from a JSON file
const credentials = JSON.parse(fs.readFileSync('credentials.json'));

const { client_id, client_secret, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

function getAuthUrl() {
  const scopes = ['https://www.googleapis.com/auth/drive.file'];
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
}

async function setCredentials(code) {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    // Save the tokens to a file or database if needed for future use
    fs.writeFileSync('token.json', JSON.stringify(tokens));
  } catch (error) {
    console.error('Error setting credentials:', error.message);
    throw error;
  }
}

async function loadCredentials() {
  try {
    const tokens = JSON.parse(fs.readFileSync('token.json')); console.log('tokens', tokens);
    oAuth2Client.setCredentials(tokens);
  } catch (error) {
    console.error('Error loading credentials:', error.message);
  }
}

module.exports = { oAuth2Client, getAuthUrl, setCredentials, loadCredentials };
