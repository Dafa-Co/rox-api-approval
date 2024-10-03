import { NextFunction, Request, Response } from "express";
import { API_KEY } from "../../server";

export function checkApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-verify-key"];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid API key" });
  }
  next();
}
