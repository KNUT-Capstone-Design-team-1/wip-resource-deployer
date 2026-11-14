import { Storage } from "@google-cloud/storage";
import { createHash } from "node:crypto";
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
  tables: { pill_data: { total: number; pages: Record<string, Page[]> } };
}
const hash = (body: Buffer) => createHash("sha256").update(body).digest("hex");
const latestPath = "resource-pages/latest.json";
const encodings = ["identity", "br", "gzip", "deflate"];

function status(error: unknown) {
  return Number((error as { code?: number | string } | null)?.code);
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
  if (name === "pill_data.json")
    return uploadPillDataResources(directory, storage, bucketName);
  const body = await fs.readFile(path.join(directory, name));
  if (!Array.isArray(JSON.parse(body.toString("utf8")).resources)) {
    throw new Error(`Not a public resource: ${name}`);
  }
  await backupResourceFile(name, directory);
  await storage
    .bucket(bucketName)
    .file(name)
    .save(body, {
      resumable: false,
      gzip: false,
      validation: "crc32c",
      metadata: { contentType: "application/json", cacheControl: "no-store" },
    });
  logger.info(
    "[RESOURCE-UPLOAD] Published bucket=%s resource=%s",
    bucketName,
    name,
  );
}

/** Publish all referenced objects before switching the API's current snapshot. */
export async function uploadPillDataResources(
  directory = RESOURCE_DIRECTORY,
  storage = new Storage(),
  bucketName = process.env.RESOURCE_DATA_BUCKET || "wip-bucket",
) {
  const manifestBody = await fs.readFile(path.join(directory, latestPath));
  const manifest = JSON.parse(manifestBody.toString("utf8")) as Manifest;
  const table = manifest.tables?.pill_data;
  if (
    manifest.format !== 1 ||
    !table ||
    !Number.isSafeInteger(table.total) ||
    table.total < 0 ||
    Object.keys(manifest.tables).length !== 1 ||
    !table.pages ||
    Object.keys(table.pages).length !== 1 ||
    !Array.isArray(table.pages["5000"]) ||
    table.pages["5000"].length !== Math.ceil(table.total / 5000)
  ) {
    throw new Error("Invalid pill_data snapshot; regenerate before uploading");
  }

  const rawBody = await fs.readFile(path.join(directory, "pill_data.json"));
  const raw = JSON.parse(rawBody.toString("utf8"));
  if (!Array.isArray(raw.resources) || raw.resources.length !== table.total) {
    throw new Error("pill_data.json does not match the prepared snapshot");
  }
  const descriptors = new Map<string, Descriptor>();
  for (const [index, page] of table.pages["5000"].entries()) {
    if (!page.files || Object.keys(page.files).length !== encodings.length) {
      throw new Error("Invalid page encodings");
    }
    for (const encoding of encodings) {
      const file = page.files[encoding];
      if (
        !file ||
        !/^resource-pages\/pill_data\/[a-f0-9]{64}\.(identity|br|gzip|deflate)$/.test(
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
      throw new Error("pill_data.json does not match the prepared snapshot");
    }
  }

  // Check local bytes before making any changes to GCS.
  for (const file of descriptors.values()) {
    const body = await fs.readFile(path.join(directory, file.path));
    if (body.length !== file.bytes || hash(body) !== file.sha256) {
      throw new Error(`Page checksum mismatch: ${file.path}`);
    }
  }

  await backupResourceFile("pill_data.json", directory);
  await backupResourceFile(latestPath, directory);

  const bucket = storage.bucket(bucketName);
  const latest = bucket.file(latestPath);
  let generation: string | number = 0;
  try {
    const [metadata] = await latest.getMetadata();
    if (!metadata.generation)
      throw new Error("Missing latest manifest generation");
    generation = metadata.generation;
  } catch (error) {
    if (status(error) !== 404) throw error;
  }

  async function saveImmutable(
    objectPath: string,
    body: Buffer,
    contentType: string,
  ) {
    const file = bucket.file(objectPath);
    try {
      await file.save(body, {
        resumable: false,
        gzip: false,
        validation: "crc32c",
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      if (status(error) !== 412) throw error;
      const [existing] = await file.download({ decompress: false });
      if (!existing.equals(body))
        throw new Error(`Immutable GCS object differs: ${objectPath}`);
    }
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
    await saveImmutable(file.path, body, "application/octet-stream");
  }
  await saveImmutable(
    `resource-pages/manifests/${hash(manifestBody)}.json`,
    manifestBody,
    "application/json",
  );
  await bucket.file("pill_data.json").save(rawBody, {
    resumable: false,
    gzip: false,
    validation: "crc32c",
    metadata: { contentType: "application/json", cacheControl: "no-store" },
  });
  // A concurrent publisher must not be overwritten after we captured its generation.
  await latest.save(manifestBody, {
    resumable: false,
    gzip: false,
    validation: "crc32c",
    preconditionOpts: { ifGenerationMatch: generation },
    metadata: { contentType: "application/json", cacheControl: "no-store" },
  });
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
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !/^[a-z][a-z0-9_]*\.json$/.test(entry.name))
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
