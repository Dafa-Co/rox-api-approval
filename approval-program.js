require("dotenv").config();
const express = require("express");
const router = express.Router();
const app = express()
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.BUCKET_NAME) {
  console.error('\x1b[31m', 'Some environment variables are missed!')
  process.exit()
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const writeToS3Bucket = async (fileKey, data) => {
  fileKey = `${process.env.AWS_DIRECTORY}/${fileKey}`
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileKey,
    Body: data,
    ContentType: 'plain/text'
  };

  return await s3.send(new PutObjectCommand(params));
}


const readFromS3Bucket = async (fileKey) => {
  fileKey = `${process.env.AWS_DIRECTORY}/${fileKey}`
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileKey,
  }
  const response = await s3.send(new GetObjectCommand(params));
  return await response.Body.transformToString()
}

const getFileKey = (vault_name, wallet_id) => {
  const dirName = vault_name.toLowerCase().replace(/ /g, '-')
  return `${dirName}/${wallet_id}.txt`
}

router.get("/get-private-key/:vault_name/:wallet_id", async (req, res) => {
  const { vault_name, wallet_id } = req.params
  if (!Number(wallet_id)) res.status(422).json("wallet_id must be a valid number")
  try {
    const fileKey = getFileKey(vault_name, wallet_id)
    const response = await readFromS3Bucket(fileKey)
    return res.status(200).json({ private_key: response });
  } catch (err) {
    return res.status(400).json(err);
  }
});

router.post("/set-private-key/:vault_name/:wallet_id", async (req, res) => {
  const { vault_name, wallet_id } = req.params
  if (!req.body.private_key) return res.status(422).json("private_key field is required")
  const { private_key } = req.body
  if (!Number(wallet_id)) return res.status(422).json("wallet_id must be a valid number")
  try {
    const fileKey = getFileKey(vault_name, wallet_id)
    await writeToS3Bucket(fileKey, private_key)
    return res.status(201).json("Private key set successfully.");
  } catch (err) {
    return res.status(400).json(err);
  }
});

app.use(express.json())

const port = 8000

app.listen(port, () => {
  console.log(`API approval program is up and running.`)
})

app.use("/api", [
  router
])

