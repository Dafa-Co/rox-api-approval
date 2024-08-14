import { CREDENTIALS_PATH } from "./constants";

const fs = require('fs');
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const clientId = credentials.onedrive.client_id;
const clientSecret = credentials.onedrive.client_secret;
const redirectUri = credentials.onedrive.redirect_uri;
const tokenUrl = credentials.onedrive.token_url;
const scope = credentials.onedrive.scope;
const authority = credentials.onedrive.authority

export {
  clientId,
  clientSecret,
  redirectUri,
  tokenUrl,
  scope,
  authority
};