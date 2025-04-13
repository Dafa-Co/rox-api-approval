import fetch from "node-fetch";
import { DriversFactory } from "../Classes/DriversFactory";
import { HEALTH_CHECK_KEY_STORAGE_KEY } from "../constants/communication.constants";
import { StorageService } from "../utils/storage.service";

const custodyUrl = process.env.CUSTODY_URL;
const serverUrl = process.env.URL;

export async function testStorageAvailability(driversFactory: DriversFactory) {
  const testFileName = "health-check-test-file";
  const testFileContent = `health-check-content-${new Date().toISOString()}`;

  await Promise.all([
    setTestFile(driversFactory, testFileName, testFileContent),
    getTestFile(driversFactory, testFileName)
  ])
}

export async function performHealthCheck(driversFactory: DriversFactory) {
  try {
    await testStorageAvailability(driversFactory);

    await sendHealthNotification(); // Notify custody service of successful health check
  } catch (error) {
    console.error("Health check failed:", error);
    await sendInactiveNotification("System is inactive"); // Notify only when health check fails
  }
}

async function setTestFile(driversFactory: DriversFactory, fileName: string, content: string) {
  try {
    await driversFactory.setKey("health-check", fileName, content);
  } catch (error) {
    console.error(`Failed to set test file '${fileName}':`, error);
    throw new Error("Failed to set test file during health check.");
  }
}

async function getTestFile(driversFactory: DriversFactory, fileName: string): Promise<string> {
  try {
    const content = await driversFactory.getKey("health-check", fileName);
    return content;
  } catch (error) {
    console.error(`Failed to retrieve test file '${fileName}':`, error);
    throw new Error("Failed to retrieve test file during health check.");
  }
}

// Notify the custody service that the system is healthy
async function sendHealthNotification() {
  try {
    const [healthCheckKey] = await new StorageService().get(HEALTH_CHECK_KEY_STORAGE_KEY, false);
    const response = await fetch(
      `${custodyUrl}/backup-storage-integration/api-approval-health-check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-health-check-key': healthCheckKey,
        },
        body: JSON.stringify({ url: serverUrl }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Health notification response:", data);
  } catch (error) {
    console.error("Failed to notify custody service of health:", error);
  }
}

// Notify the custody service that the system is inactive
async function sendInactiveNotification(message: string) {
  try {
    const [healthCheckKey] = await new StorageService().get(HEALTH_CHECK_KEY_STORAGE_KEY, false);
    const response = await fetch(
      `${custodyUrl}/backup-storage-integration/inactive-vault`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-health-check-key': healthCheckKey,
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Inactive notification response:", data);
  } catch (error) {
    console.error("Failed to notify custody service of inactivity:", error);
  }
}

export async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully.`);
  await sendInactiveNotification("Server is going down"); // Notify the custody service on shutdown

  console.log("Closing server...");
  process.exit(0);
}
