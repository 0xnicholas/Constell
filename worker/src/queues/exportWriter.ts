import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Config() {
  const enabled = process.env.CONSTELL_S3_BATCH_EXPORT_ENABLED === "true";
  const bucket = process.env.CONSTELL_S3_BATCH_EXPORT_BUCKET ?? "constell";
  const prefix = process.env.CONSTELL_S3_BATCH_EXPORT_PREFIX ?? "exports/";
  const endpoint = process.env.CONSTELL_S3_BATCH_EXPORT_ENDPOINT;
  const region = process.env.CONSTELL_S3_BATCH_EXPORT_REGION ?? "auto";
  const accessKeyId = process.env.CONSTELL_S3_BATCH_EXPORT_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CONSTELL_S3_BATCH_EXPORT_SECRET_ACCESS_KEY;
  const forcePathStyle = process.env.CONSTELL_S3_BATCH_EXPORT_FORCE_PATH_STYLE === "true";

  return {
    enabled,
    bucket,
    prefix,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  };
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const cfg = getS3Config();
    s3Client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle,
      credentials:
        cfg.accessKeyId && cfg.secretAccessKey
          ? { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey }
          : undefined,
    });
  }
  return s3Client;
}

const PRESIGN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export async function uploadExportBuffer(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string }> {
  const cfg = getS3Config();
  if (!cfg.enabled) {
    throw new Error("Batch export is disabled (CONSTELL_S3_BATCH_EXPORT_ENABLED is not true)");
  }

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });

  await client.send(command);

  // Generate time-limited presigned URL for download
  const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SECONDS });

  return { url };
}
