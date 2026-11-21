import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PAGED_RESOURCE_TABLES } from "./resource_pages";
export interface Descriptor {
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

/** Validate local snapshot metadata and selected table bytes without remote mutations. */
export async function prepareResourceSnapshot(
  directory: string,
  selectedTables?: readonly string[],
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
  const selected = new Set(selectedTables ?? Object.keys(manifest.tables));
  if (
    !selected.size ||
    [...selected].some(
      (table) => !Object.prototype.hasOwnProperty.call(manifest.tables, table),
    )
  )
    throw new Error("Selected table missing from prepared snapshot");
  const descriptors = new Map<string, Descriptor>();
  const retainedDescriptors = new Map<string, Descriptor>();
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

    const isSelected = selected.has(tableName);
    const rawBody = isSelected
      ? await fs.readFile(path.join(directory, tableName + ".json"))
      : undefined;
    if (rawBody) originals.set(tableName + ".json", rawBody);
    const raw = rawBody ? JSON.parse(rawBody.toString("utf8")) : undefined;
    if (
      isSelected &&
      (!Array.isArray(raw.resources) || raw.resources.length !== table.total)
    )
      throw new Error(tableName + ".json does not match the prepared snapshot");
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
        (isSelected ? descriptors : retainedDescriptors).set(file.path, file);
      }
      if (!isSelected) continue;
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

  return { manifestBody, descriptors, retainedDescriptors, originals };
}
