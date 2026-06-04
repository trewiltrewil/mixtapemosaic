import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadObjectInput = {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
};

let cachedClient: S3Client | null | undefined;

function endpointFromEnv() {
  if (process.env.R2_ENDPOINT) {
    return process.env.R2_ENDPOINT;
  }

  if (process.env.R2_ACCOUNT_ID) {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  return null;
}

function getR2Client() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const endpoint = endpointFromEnv();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  return cachedClient;
}

export function requireR2Client() {
  const client = getR2Client();
  if (!client) {
    throw new Error(
      "Cloudflare R2 is not configured. Add R2_ACCOUNT_ID or R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  return client;
}

export function getR2BucketNames() {
  return {
    originals: process.env.R2_ORIGINALS_BUCKET_NAME ?? "mixtape-mosaic-artwork-originals",
    derivatives: process.env.R2_DERIVATIVES_BUCKET_NAME ?? "mixtape-mosaic-artwork-images"
  };
}

export function getR2PublicUrl(key: string) {
  const baseUrl = process.env.R2_PUBLIC_IMAGE_BASE_URL;
  if (!baseUrl) {
    throw new Error("R2_PUBLIC_IMAGE_BASE_URL is required for public derivative image URLs.");
  }

  return `${baseUrl.replace(/\/$/, "")}/${key}`;
}

export async function uploadR2Object({ bucket, key, body, contentType }: UploadObjectInput) {
  const client = requireR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: bucket === getR2BucketNames().derivatives ? "public, max-age=31536000, immutable" : undefined
    })
  );
}
