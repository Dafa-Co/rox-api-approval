import express, { NextFunction, Request, Response } from 'express';
import { DriversEnum } from './Enums/DriversEnum';
import { DriversFactory } from './Classes/DriversFactory';
import { catchAsync } from './utils/catchAsync'; // Import the catchAsync utility
import { body, query, validationResult } from 'express-validator';

const app = express();
app.use(express.json());
const port = 3000;
const driversFactory = new DriversFactory(DriversEnum.oneDrive);

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

app.get('/get-key', query('vault_name').notEmpty().isAlpha(), query('wallet_id').notEmpty().isNumeric(), catchAsync(async (req: Request, res: Response) => {
  const result = validationResult(req);
  
  if (result['errors'] && result['errors'].length > 0) {
    const errors = result['errors'];
    const entries = errors.map((error: { path: string; msg: string; }) => [error.path, error.msg] as [string, string]);
    
    return res.status(422).send(Object.fromEntries(entries));
  }

  const folderName = req.query.vault_name as string;
  const fileName = req.query.wallet_id as string;

  const content = await driversFactory.getKey(folderName, fileName);
  res.json({ content: { private_key: content } });
}));

app.post('/set-key', body('vault_name').notEmpty().isAlpha(), body('wallet_id').notEmpty().isNumeric(), body('key').notEmpty().isString(), catchAsync(async (req: Request, res: Response) => {
  const result = validationResult(req);
  
  if (result['errors'] && result['errors'].length > 0) {
    const errors = result['errors'];
    const entries = errors.map((error: { path: string; msg: string; }) => [error.path, error.msg] as [string, string]);
    
    return res.status(422).send(Object.fromEntries(entries));
  }

  const folderName = req.body.vault_name as string;
  const fileName = req.body.wallet_id as string;
  const content = req.body.key as string;
  const response = await driversFactory.setKey(folderName, fileName, content);

  res.status(200).send(`Key uploaded successfully`);
}));

// Error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
