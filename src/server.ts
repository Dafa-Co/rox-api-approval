import express, { NextFunction, Request, Response } from "express";
import { DriversEnum } from "./Enums/DriversEnum";
import { DriversFactory } from "./Classes/DriversFactory";
import { catchAsync } from "./utils/catchAsync"; // Import the catchAsync utility
import { body, query, validationResult } from "express-validator";
import * as dotenv from "dotenv";
import { checkApiKey } from "./utils/middlewares/api-key-auth.middleware";
import { checkOrigin } from "./utils/middlewares/check-origins.middleware";
import { IApiApprovalSyncInterface } from "./Interfaces/api-approval-sync.interface";
import { constants, publicEncrypt } from "crypto";
import { gracefulShutdown, performHealthCheck, testStorageAvailability } from "./health-check/health-check";
import { handshaking } from "./handshaking/handshaking";
import { decryptRequest } from "./utils/middlewares/decrypt-request.middleware";
import { encryptPayloadWithSession } from "./utils/encrypt-payload-with-session";

dotenv.config();

export let API_KEY = process.env.API_KEY;

const app = express();
app.use(express.json());

// Health Check Endpoint
app.post(
  "/healthz", 
  (req, res, next) => decryptRequest(req, res, next, false),
  async (req: Request, res: Response) => {
    console.info("Health check endpoint hit", req.body);

    res.status(200).json({ status: "OK", message: "Service is up and running." });
  });

app.use(checkOrigin);

const port = process.env.PORT || 3000;
let driversFactory: DriversFactory;

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
  case DriversEnum.googleCloudStorage:
    driversFactory = new DriversFactory(DriversEnum.googleCloudStorage);
    break;
  case DriversEnum.microsoftAzure:
    driversFactory = new DriversFactory(DriversEnum.microsoftAzure);
    break;
  default:
    throw new Error("Invalid handler");
}

app.get(
  "/auth-redirect",
  catchAsync(async (req: Request, res: Response) => {
    const code = req.query.code as string;

    if (!code) {
      return res.status(400).send("Authorization code not provided");
    }

    await driversFactory.getTokens(code);

    res.json({ code });
  })
);

app.get("/login", async (req, res) => {
  await driversFactory.login(req, res);
});

app.post(
  "/get-key",
  decryptRequest,
  query("folder_name").notEmpty(),
  body("key_id").notEmpty().isNumeric(),
  catchAsync(async (req: Request, res: Response) => {
    const result = validationResult(req);

    if (result["errors"] && result["errors"].length > 0) {
      const errors = result["errors"];
      const entries = errors.map(
        (error: { path: string; msg: string }) =>
          [error.path, error.msg] as [string, string]
      );

      return res.status(422).send(Object.fromEntries(entries));
    }

    const folderName = req.query.folder_name as string;
    const fileName = req.body.key_id as string;

    console.info("get-key endpoint called");
    const content = await driversFactory.getKey(folderName, fileName);

    try {
      const encryptedContent = await encryptPayloadWithSession({ private_key: content });
      res.status(200).json(encryptedContent);
    } catch (error) {
      return res.status(401).send("Not authorized");
    }
  })
);

app.post(
  "/set-key",
  query("folder_name").notEmpty(),
  decryptRequest,
  body("key_id").notEmpty().isNumeric(),
  body("key").notEmpty().isString(),
  catchAsync(async (req: Request, res: Response) => {
    const result = validationResult(req);

    if (result["errors"] && result["errors"].length > 0) {
      const errors = result["errors"];
      const entries = errors.map(
        (error: { path: string; msg: string }) =>
          [error.path, error.msg] as [string, string]
      );

      return res.status(422).send(Object.fromEntries(entries));
    }

    const folderName = req.query.folder_name as string;
    const fileName = req.body.key_id as string;
    const content = req.body.key as string;
    
    try {
      await driversFactory.setKey(
        folderName,
        fileName,
        content
      );
    } catch (error) {
      console.error("Failed to set key:", error);
      throw new Error("Failed to set key");
    }

    res.status(200).send(`Key uploaded successfully`);
  })
);

// Error-handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.status === 409) {
    return res.status(409).json({
      status: "error",
      message: "File not found",
    });
  }

  return res.status(500).json({
    status: "error",
    message:
      err.message === "UnknownError"
        ? "File not found"
        : err.message || "Internal Server Error",
  });
});

app.listen(port, async () => {
  console.log(`Server running at ${process.env.DOMAIN}:${port}`);

  const containedHandshaking = async () => {
    try {
      await handshaking();
    } catch (error) {
      console.error("Failed to handshake:", error);
      setTimeout(() => {
        console.log("Retrying handshaking...");
        containedHandshaking();
      }, 20_000); // Retry after 20 second
    }
  }

  await containedHandshaking();

  const FortyFiveMinutes = 45 * 60 * 1000; // 45 minutes in milliseconds
  setInterval(async () => {
    await containedHandshaking();
  }, FortyFiveMinutes); // Run handshaking every 45 minutes

  try {
    const containedHealthCheck = () => performHealthCheck(driversFactory);

    await containedHealthCheck();

    setInterval(containedHealthCheck, 30000); // Run health check every 30 seconds
  } catch (error) {
    console.error("Initial health check failed:", error);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Listen for TERM signal (e.g., kill) and INT signal (e.g., Ctrl-C)
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
