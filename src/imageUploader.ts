import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadImageToR2(buffer: Buffer): Promise<string> {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!bucket || !publicUrl) throw new Error("CLOUDFLARE_R2_BUCKET and CLOUDFLARE_R2_PUBLIC_URL must be set");

  const key = `blog-images/hero-${Date.now()}.jpg`;

  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "image/jpeg",
  }));

  return `${publicUrl}/${key}`;
}
