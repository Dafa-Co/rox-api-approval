const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { oAuth2Client, setCredentials, loadCredentials, getAuthUrl } = require('./auth');

async function uploadFile(filePath) {
    console.log('codeeeeeee', getAuthUrl());
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  const fileMetadata = {
    name: path.basename(filePath),
  };
  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(filePath),
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log('File Id:', response.data.id);
  } catch (error) {
    console.error('Error uploading file:', error.message);
    if (error.response) {
      console.error('Detailed error:', error.response.data);
    }
  }
}

async function main() {
    //await setCredentials('4/0AcvDMrDlloJxaewVFgOKQO3kAeS4Nq9V0DhOR5mrEXRqBs5LR-IBMNCLy2ZPfAXZ8R8q2w');
  // Load existing credentials
  await loadCredentials();

  const filePath = 'files/photo.jpg'; // Replace with the path to the file you want to upload
  await uploadFile(filePath);

    // If you need to set credentials with a new authorization code
    //const code = getAuthUrl(); // Replace with the code obtained from OAuth2 authorization
    //await setCredentials(code);
}


main();
