import { NextFunction, Request, Response } from "express";


export function checkOrigin(req: Request, res: Response, next: NextFunction) {
    // const origin = req.headers;
    // if (origin !== process.env.ALLOWED_ORIGIN) {
    //   return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
    // }
    next();
  }
