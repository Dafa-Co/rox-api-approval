import express, { NextFunction, Request, Response } from 'express';
import { DriversEnum } from './Enums/DriversEnum';
import { DriversFactory } from './Classes/DriversFactory';
import { catchAsync } from './utils/catchAsync'; // Import the catchAsync utility
import { body, query, validationResult } from 'express-validator';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const app = express();
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
