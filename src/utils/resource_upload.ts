import { prepareResourceSnapshot } from "./resource_snapshot";
import { createResourcePages, PAGED_RESOURCE_TABLES } from "./resource_pages";
import { Bucket, File, Storage } from "@google-cloud/storage";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RESOURCE_DIRECTORY } from "./paths";
import logger from "./logger";
import { backupResourceFile } from "./resource_backup";

const hash = (body: Buffer) => createHash("sha256").update(body).digest("hex");
const latestPath = "resource-pages/latest.json";

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
      (relative === latestPath ||
        relative.startsWith("resource-pages/manifests/") ||
        PAGED_RESOURCE_TABLES.some(
          (table) =>
            relatedNames.includes(table + ".json") &&
            relative.startsWith("resource-pages/" + table + "/"),
        )));
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
    return uploadPagedResources(directory, storage, bucketName, [
      name.slice(0, -5),
    ]);
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

/** Publish only the functional food tables while retaining other snapshot references. */
export async function uploadFunctionalFoodResources(
  directory = RESOURCE_DIRECTORY,
  storage = new Storage(),
  bucketName = process.env.RESOURCE_DATA_BUCKET || "wip-bucket",
) {
  return uploadPagedResources(directory, storage, bucketName, [
    "functional_food_classification",
    "health_functional_food_raw_material",
  ]);
}

/** Publish all referenced objects before switching the API's current snapshot. */
export async function uploadPillDataResources(
  directory = RESOURCE_DIRECTORY,
  storage = new Storage(),
  bucketName = process.env.RESOURCE_DATA_BUCKET || "wip-bucket",
) {
  return uploadPagedResources(directory, storage, bucketName, ["pill_data"]);
}

export async function uploadPagedResources(
  directory = RESOURCE_DIRECTORY,
  storage = new Storage(),
  bucketName = process.env.RESOURCE_DATA_BUCKET || "wip-bucket",
  selectedTables?: readonly string[],
) {
  const { manifestBody, descriptors, retainedDescriptors, originals } =
    await prepareResourceSnapshot(directory, selectedTables);
  // A combined manifest must only reference retained pages already published to GCS.
  const bucket = storage.bucket(bucketName);
  for (const file of retainedDescriptors.values()) {
    const [body] = await bucket
      .file(resourcePath(file.path))
      .download({ decompress: false });
    if (body.length !== file.bytes || hash(body) !== file.sha256)
      throw new Error(
        "Retained resource page missing or changed in GCS: " + file.path,
      );
  }

  for (const name of originals.keys())
    await backupResourceFile(name, directory);
  await backupResourceFile(latestPath, directory);

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
