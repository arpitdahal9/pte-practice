import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, StoredFile } from "./index";

/** Dev storage: writes to ./public/uploads and serves via /uploads/... */
export class LocalStorageDriver implements StorageDriver {
  private root = path.join(process.cwd(), "public", "uploads");

  async save(key: string, data: Buffer, _contentType: string): Promise<StoredFile> {
    const full = path.join(this.root, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return { url: `/uploads/${key}`, key };
  }
}
