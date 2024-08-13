import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { oAuth2Client, getAuthUrl, getTokens, loadToken } from './auth';
import { DriversEnum } from './Enums/DriversEnum';
import { DriversFactory } from './Classes/DriversFactory';

const app = express();
app.use(express.json());
const port = 3000;
let code: string | null = null;

const driversFactory = new DriversFactory(DriversEnum.google);


// Load OAuth token
loadToken();

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

app.get('/', async (req: Request, res: Response) => {
  code = req.query.code as string;

  if (code) {
    await getTokens(code);
    res.json({ code });
  } else {
    res.status(400).send('Authorization code missing.');
  }
});

app.get('/get-key', async (req: Request, res: Response) => {
  const folderName = req.query.vault_name as string;
  const fileName = req.query.wallet_id as string;


  if (!folderName || !fileName ) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const content = await driversFactory.getKey(folderName, fileName, drive);
    res.json({ content: { private_key: content } });
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({ error: 'Error retrieving file' });
  }
});

app.post('/set-key', async (req: Request, res: Response) => {  
  const folderName = req.body.vault_name as string;
  const fileName = req.body.wallet_id as string;
  const content = req.body.key as string;

  if (!folderName || !fileName || !content) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const response = await driversFactory.setKey(folderName, fileName, content, drive); console.log('response', response)

    res.status(200).send(`Key uploaded successfully`);
  } catch (error) {
    // Type guard to check if error is an instance of Error
    if (error instanceof Error) {
      res.status(500).send(`Error uploading key: ${error.message}`);
    } else {
      res.status(500).send(`Error uploading key`);
    }
  }
});

app.get('/setup-auth', (req: Request, res: Response) => {
  const url = getAuthUrl();
  res.redirect(url);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
