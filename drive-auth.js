const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json';

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync('client_secret_199617266500-ul7gspgu8j65vrkn4scqlmi5inoe46tt.apps.googleusercontent.com.json'));
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  'urn:ietf:wg:oauth:2.0:oob'
);


  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(
      JSON.parse(fs.readFileSync(TOKEN_PATH))
    );
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  console.log('Authorize this app by visiting this URL:\n', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const code = await new Promise(resolve =>
    rl.question('Enter the code here: ', answer => {
      rl.close();
      resolve(answer);
    })
  );

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

  console.log('✅ OAuth token saved');
  return oAuth2Client;
}

module.exports = authorize;
