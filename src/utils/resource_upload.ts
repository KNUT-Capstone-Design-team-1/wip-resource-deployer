import { createResourcePages, PAGED_RESOURCE_TABLES } from "./resource_pages";
import { Bucket, File, Storage } from "@google-cloud/storage";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RESOURCE_DIRECTORY } from "./paths";
import logger from "./logger";
import { backupResourceFile } from "./resource_backup";

interface Descriptor {
  path: string;
  bytes: number;
  sha256: string;
}
interface Page {
  bodyLength: number;
  etag: string;
  files: Record<string, Descriptor>;
}
interface Manifest {
  format: number;
  tables: Record<string, { total: number; pages: Record<string, Page[]> }>;
}
const hash = (body: Buffer) => createHash("sha256").update(body).digest("hex");
const latestPath = "resource-pages/latest.json";
const encodings = ["identity", "br", "gzip", "deflate"];

// Local paths and manifest descriptors stay relative; prefix only GCS objects.
const resourcePath = (name: string) => `resources/${name}`;

/** Archive the previous backup locally before replacing it with published data. */
async function rotatePublishedResources(
  bucket: Bucket,
  directory: string,
  name: string,
  relatedNames = [name],
) {
  const includes = (relative: string) =>
    relatedNames.includes(relative) ||
    (PAGED_RESOURCE_TABLES.some((table) =>
      relatedNames.includes(`${table}.json`),
    ) &&
      relative.startsWith("resource-pages/"));
  const [currentFiles] = await bucket.getFiles({ prefix: "current/" });
  const [publishedFiles] = await bucket.getFiles({ prefix: "resources/" });
  const stamp =
    new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID();
  const archive = path.join(directory, "backups", "gcs-current", stamp);

  // Finish every download before changing any remote backup.
  for (const file of currentFiles) {
    const relative = file.name.slice("current/".length);
    if (!includes(relative)) continue;
    if (
      relative
        .split("/")
        .some((part) => !part || part === "." || part === "..") ||
      relative.includes("\\") ||
      relative.includes(":")
    ) {
      throw new Error("Invalid remote backup path: " + file.name);
    }
    const [body] = await file.download({ decompress: false });
    const target = path.join(archive, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body, { flag: "wx" });
  }

  for (const file of publishedFiles) {
    const relative = file.name.slice("resources/".length);
    if (!includes(relative)) continue;
    const target = bucket.file("current/" + relative);
    const [body] = await file.download({ decompress: false });
    await file.copy(target);
    await verifyUpload(target, body);
  }
  logger.info(
    "[RESOURCE-UPLOAD] Rotation completed resource=%s archive=%s",
    name,
    archive,
  );
}

async function verifyUpload(file: File, expected: Buffer) {
  const [actual] = await file.download({ decompress: false });
  if (actual.length !== expected.length || hash(actual) !== hash(expected)) {
    throw new Error(`Uploaded resource checksum mismatch: ${file.name}`);
  }
}

/** Upload one public JSON resource; local histories are never uploaded. */
export async function uploadResourceFile(
  name: string,
  directory = RESOURCE_DIRECTORY,
  storage = new Storage(),
  bucketName = process.env.RESOURCE_DATA_BUCKET || "wip-bucket",
) {
  if (!/^[a-z][a-z0-9_]*\.json$/.test(name))
    throw new Error("Invalid resource filename");
  if (PAGED_RESOURCE_TABLES.some((table) => name === `${table}.json`))
    return uploadPagedResources(directory, storage, bucketName);
  const body = await fs.readFile(path.join(directory, name));
  if (!Array.isArray(JSON.parse(body.toString("utf8")).resources)) {
    throw new Error(`Not a public resource: ${name}`);
  }
  await backupResourceFile(name, directory);
  await rotatePublishedResources(storage.bucket(bucketName), directory, name);
  await storage
    .bucket(bucketName)
    .file(resourcePath(name))
    .save(body, {
      resumable: false,
      gzip: false,
      validation: "crc32c",
      metadata: { contentType: "application/json", cacheControl: "no-store" },
    });
  await verifyUpload(storage.bucket(bucketName).file(resourcePath(name)), body);
  logger.info(
    "[RESOURCE-UPLOAD] Published bucket=%s resource=%s",
    bucketName,
    resourcePath(name),
  );
}

/** Publish all referenced objects before switching the API's current snapshot. */
export const uploadPillDataResources = uploadPagedResources;

export async function uploadPagedResources(
  directory = RESOURCE_DIRECTORY,
  storage = new Storage(),
  bucketName = process.env.RESOURCE_DATA_BUCKET || "wip-bucket",
) {
  const manifestBody = await fs.readFile(path.join(directory, latestPath));
  const manifest = JSON.parse(manifestBody.toString("utf8")) as Manifest;
  if (
    manifest.format !== 1 ||
    !manifest.tables ||
    typeof manifest.tables !== "object" ||
    Array.isArray(manifest.tables) ||
    !Object.keys(manifest.tables).length
  )
    throw new Error("Invalid resource snapshot; regenerate before uploading");
  const descriptors = new Map<string, Descriptor>();
  const originals = new Map<string, Buffer>();
  for (const [tableName, table] of Object.entries(manifest.tables)) {
    if (!(PAGED_RESOURCE_TABLES as readonly string[]).includes(tableName))
      throw new Error("Invalid resource snapshot table");
    if (
      manifest.format !== 1 ||
      !table ||
      !Number.isSafeInteger(table.total) ||
      table.total < 0 ||
      !table.pages ||
      Object.keys(table.pages).length !== 1 ||
      !Array.isArray(table.pages["5000"]) ||
      table.pages["5000"].length !== Math.ceil(table.total / 5000)
    ) {
      throw new Error("Invalid resource snapshot; regenerate before uploading");
    }

    const rawBody = await fs.readFile(
      path.join(directory, `${tableName}.json`),
    );
    originals.set(`${tableName}.json`, rawBody);
    const raw = JSON.parse(rawBody.toString("utf8"));
    if (!Array.isArray(raw.resources) || raw.resources.length !== table.total) {
      throw new Error(`${tableName}.json does not match the prepared snapshot`);
    }
    for (const [index, page] of table.pages["5000"].entries()) {
      if (!page.files || Object.keys(page.files).length !== encodings.length) {
        throw new Error("Invalid page encodings");
      }
      for (const encoding of encodings) {
        const file = page.files[encoding];
        if (
          !file ||
          !file.path.startsWith(`resource-pages/${tableName}/`) ||
          !/^resource-pages\/[a-z_]+\/[a-f0-9]{64}\.(identity|br|gzip|deflate)$/.test(
            file.path,
          ) ||
          !file.path.endsWith(`.${encoding}`) ||
          !Number.isSafeInteger(file.bytes) ||
          file.bytes < 0 ||
          !/^[a-f0-9]{64}$/.test(file.sha256)
        )
          throw new Error("Invalid page descriptor");
        descriptors.set(file.path, file);
      }
      const expected = Buffer.from(
        JSON.stringify({
          resource: raw.resources.slice(index * 5000, (index + 1) * 5000),
          total: table.total,
          totalPage: table.pages["5000"].length,
          current: index * 5000,
        }),
      );
      if (
        page.bodyLength !== expected.length ||
        page.files.identity.sha256 !== hash(expected) ||
        page.etag !==
          `W/"${createHash("sha256").update(expected).digest("base64")}"`
      ) {
        throw new Error(
          `${tableName}.json does not match the prepared snapshot`,
        );
      }
    }
  }

  // Check local bytes before making any changes to GCS.
  for (const file of descriptors.values()) {
    const body = await fs.readFile(path.join(directory, file.path));
    if (body.length !== file.bytes || hash(body) !== file.sha256) {
      throw new Error(`Page checksum mismatch: ${file.path}`);
    }
  }

  for (const name of originals.keys())
    await backupResourceFile(name, directory);
  await backupResourceFile(latestPath, directory);

  const bucket = storage.bucket(bucketName);
  const names = [...originals.keys()];
  await rotatePublishedResources(bucket, directory, names[0], names);
  const latest = bucket.file(resourcePath(latestPath));

  async function saveSnapshotFile(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ) {
    const file = bucket.file(resourcePath(objectPath));
    await file.save(body, {
      resumable: false,
      gzip: false,
      validation: "crc32c",
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    await verifyUpload(file, body);
  }

  logger.info(
    "[RESOURCE-UPLOAD] Started bucket=%s pages=%s",
    bucketName,
    descriptors.size,
  );
  for (const file of descriptors.values()) {
    const body = await fs.readFile(path.join(directory, file.path));
    // Recheck the exact buffer being sent if a local build ran during validation.
    if (body.length !== file.bytes || hash(body) !== file.sha256) {
      throw new Error(`Page changed during upload: ${file.path}`);
    }
    await saveSnapshotFile(file.path, body, "application/octet-stream");
  }
  await saveSnapshotFile(
    `resource-pages/manifests/${hash(manifestBody)}.json`,
    manifestBody,
    "application/json",
  );
  for (const [name, rawBody] of originals) {
    const original = bucket.file(resourcePath(name));
    await original.save(rawBody, {
      resumable: false,
      gzip: false,
      validation: "crc32c",
      metadata: { contentType: "application/json", cacheControl: "no-store" },
    });
    await verifyUpload(original, rawBody);
  }
  // Publish latest last, replacing any existing snapshot pointer.
  await latest.save(manifestBody, {
    resumable: false,
    gzip: false,
    validation: "crc32c",
    metadata: { contentType: "application/json", cacheControl: "no-store" },
  });
  await verifyUpload(latest, manifestBody);
  logger.info(
    "[RESOURCE-UPLOAD] Published bucket=%s manifest=%s",
    bucketName,
    hash(manifestBody),
  );
}

export async function uploadAllResources(
  directory = RESOURCE_DIRECTORY,
  storage = new Storage(),
) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const tables: Record<string, readonly unknown[]> = {};
  for (const table of PAGED_RESOURCE_TABLES) {
    if (
      !entries.some((entry) => entry.isFile() && entry.name === table + ".json")
    )
      continue;
    const raw = JSON.parse(
      await fs.readFile(path.join(directory, table + ".json"), "utf8"),
    );
    if (!Array.isArray(raw.resources))
      throw new Error("Not a public resource: " + table);
    tables[table] = raw.resources;
  }
  if (Object.keys(tables).length) {
    await createResourcePages(tables, directory);
    await uploadPagedResources(directory, storage);
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !/^[a-z][a-z0-9_]*\.json$/.test(entry.name))
      continue;
    if (PAGED_RESOURCE_TABLES.some((table) => entry.name === table + ".json"))
      continue;
    const resource = JSON.parse(
      await fs.readFile(path.join(directory, entry.name), "utf8"),
    );
    // Excludes reports, search retry records and other local working data.
    if (!Array.isArray(resource?.resources)) continue;
    await uploadResourceFile(entry.name, directory, storage);
  }
}

if (require.main === module) {
  uploadAllResources().catch((error: unknown) => {
    logger.error("[RESOURCE-UPLOAD] Failed: %s", error);
    process.exitCode = 1;
  });
}
