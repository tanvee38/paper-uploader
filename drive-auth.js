const { google } = require('googleapis');

/**
 * GitHub Actions safe OAuth for Google Drive.
 * Requires two secrets:
 * - GDRIVE_OAUTH_JSON => contents of client_secret_*.json
 * - GDRIVE_TOKEN_JSON => contents of token.json with refresh token
 */

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function authorize() {
  // Read client secret from environment variable
  const credentialsJSON = process.env.GDRIVE_OAUTH_JSON;
  if (!credentialsJSON) throw new Error('GDRIVE_OAUTH_JSON not set');

  const credentials = JSON.parse(credentialsJSON);
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Read existing token from environment variable
  const tokenJSON = process.env.GDRIVE_TOKEN_JSON;
  if (!tokenJSON) throw new Error('GDRIVE_TOKEN_JSON not set');

  const tokens = JSON.parse(tokenJSON);
  oAuth2Client.setCredentials(tokens);

  return oAuth2Client;
}

module.exports = authorize;
