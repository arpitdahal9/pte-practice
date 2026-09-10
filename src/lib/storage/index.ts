import { env } from "@/lib/env";
import { LocalStorageDriver } from "./local";
import { S3StorageDriver } from "./s3";

export interface StoredFile {
  /** Publicly reachable URL (relative for local, absolute for S3). */
  url: string;
  /** Storage key/path. */
  key: string;
}

export interface StorageDriver {
  save(key: string, data: Buffer, contentType: string): Promise<StoredFile>;
}

let driver: StorageDriver | null = null;

/** Get the configured storage driver (swappable via STORAGE_DRIVER env). */
export function getStorage(): StorageDriver {
  if (driver) return driver;
  driver = env.STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
  return driver;
}

/** Build a unique-ish object key for an upload. */
export function buildKey(prefix: string, userId: string, ext: string): string {
  const rand = Math.floor(performance.now() * 1000).toString(36);
  return `${prefix}/${userId}/${Date.now()}-${rand}.${ext.replace(/^\./, "")}`;
}
