import express, { NextFunction, Request, Response } from 'express';
import { DriversEnum } from './Enums/DriversEnum';
import { DriversFactory } from './Classes/DriversFactory';
import { catchAsync } from './utils/catchAsync'; // Import the catchAsync utility
import { body, query, validationResult } from 'express-validator';
import * as dotenv from 'dotenv';
import * as process from 'process';
import { checkApiKey } from './utils/middlewares/api-key-auth.middleware';
import { checkOrigin } from './utils/middlewares/check-origins.middleware';

dotenv.config();

export let API_KEY = process.env.API_KEY;

const app = express();
app.use(express.json());
app.use(checkApiKey); // Apply API Key check globally

// Health Check Endpoint
app.get('/healthz', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Service is up and running.' });
});

// Update API Key Endpoint
app.post('/update-api-key', (req: Request, res: Response) => {
  // Assuming body contains newKey and we have a method to update it
  const { newKey } = req.body;
  API_KEY = newKey;
  res.status(200).json({ message: 'API Key updated successfully.' });
});

app.use(checkOrigin);

const port = process.env.PORT || 3000;
let driversFactory : DriversFactory;

switch (process.env.HANDLER) {
      case DriversEnum.googleDrive:
        driversFactory = new DriversFactory(DriversEnum.googleDrive);
        break;
      case DriversEnum.oneDrive:
        driversFactory = new DriversFactory(DriversEnum.oneDrive);
        break;
      case DriversEnum.amazonS3:
        driversFactory = new DriversFactory(DriversEnum.amazonS3);
        break;
      case DriversEnum.dropbox:
        driversFactory = new DriversFactory(DriversEnum.dropbox);
        break;
      default:
        throw new Error("Invalid handler");
}

app.get('/auth-redirect', catchAsync(async (req: Request, res: Response) => {
  const code = req.query.code as string;


  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }

  await driversFactory.getTokens(code);

  res.json({ code });
}));

app.get('/login', async (req, res) => {
  await driversFactory.login(req, res);
});

app.get('/get-key', query('vault_name').notEmpty().isAlpha(), query('key_id').notEmpty().isNumeric(), catchAsync(async (req: Request, res: Response) => {
  const result = validationResult(req);

  if (result['errors'] && result['errors'].length > 0) {
    const errors = result['errors'];
    const entries = errors.map((error: { path: string; msg: string; }) => [error.path, error.msg] as [string, string]);

    return res.status(422).send(Object.fromEntries(entries));
  }

  const folderName = req.query.vault_name as string;
  const fileName = req.query.key_id as string;

  const content = await driversFactory.getKey(folderName, fileName);
  res.json({ content: { private_key: content } });
}));

app.post('/set-key', body('vault_name').notEmpty().isAlpha(), body('key_id').notEmpty().isNumeric(), body('key').notEmpty().isString(), catchAsync(async (req: Request, res: Response) => {
  const result = validationResult(req);

  if (result['errors'] && result['errors'].length > 0) {
    const errors = result['errors'];
    const entries = errors.map((error: { path: string; msg: string; }) => [error.path, error.msg] as [string, string]);

    return res.status(422).send(Object.fromEntries(entries));
  }

  const folderName = req.body.vault_name as string;
  const fileName = req.body.key_id as string;
  const content = req.body.key as string;
  const response = await driversFactory.setKey(folderName, fileName, content);

  res.status(200).send(`Key uploaded successfully`);
}));

// Error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {

    if(err.status === 409) {
      return res.status(409).json({
        status: 'error',
        message: 'File not found'
      });
    }

    return res.status(500).json({
        status: 'error',
        message: err.message === 'UnknownError' ? 'File not found' : (err.message || 'Internal Server Error')
    });
});

app.listen(port, async () => {
  console.log(`Server running at ${process.env.DOMAIN}:${port}`);
  const custodyUrl = process.env.CUSTODY_URL;
  try {
    const healthCheck = async () => {
      try {
        const response = await fetch(`${custodyUrl}/integration/vaults/api-approval-health-check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          body: JSON.stringify({ url: process.env.URL })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Vault verification response:', data);
      } catch (error) {
        console.error('Failed to verify vault:', error);
      }
    };

    // Initial health check on server start
    await healthCheck();

    // Set interval to perform health check every 60 seconds
    setInterval(healthCheck, 30000);  } catch (error) {
    console.error('Failed to verify vault:', error);
  }
});

// // Function to handle graceful shutdown
// async function gracefulShutdown(signal: string) {
//   console.log(`Received ${signal}. Shutting down gracefully.`);
//   const custodyUrl = process.env.CUSTODY_URL;
//   try {
//     // Notify an API that the server is going down
//     const response = await fetch(`${custodyUrl}/integration/vaults/inactive-vault`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-API-Key': API_KEY
//       },
//       body: JSON.stringify({ message: 'Server is going down' })
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log('Shutdown notification response:', data);

//   } catch (error) {
//     console.error('Failed to notify shutdown:', error);
//   } finally {
//     console.log('Closing server...');
//     process.exit(0);
//   }
// }

// process.on('beforeExit', (err) => {
//   console.error('Uncaught Exception:', err);
//   process.exit(1);
// });

// // // Listen for TERM signal .e.g. kill
// // process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// // // Listen for INT signal e.g. Ctrl-C
// // process.on('SIGINT', () => gracefulShutdown('SIGINT'));
