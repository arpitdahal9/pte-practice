import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import type { StorageDriver, StoredFile } from "./index";

/** Production storage: any S3-compatible bucket (AWS S3, MinIO, Cloudflare R2). */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async save(key: string, data: Buffer, contentType: string): Promise<StoredFile> {
    if (!env.S3_BUCKET) {
      throw new Error("S3_BUCKET is not configured");
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    const base =
      env.S3_PUBLIC_URL ||
      (env.S3_ENDPOINT ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}` : "");
    return { url: `${base.replace(/\/$/, "")}/${key}`, key };
  }
}
