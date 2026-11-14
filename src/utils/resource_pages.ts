import { backupResourceFile } from "./resource_backup";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { brotliCompress, constants, deflate, gzip } from "node:zlib";
import { RESOURCE_DIRECTORY } from "./paths";

const compressBrotli = promisify(brotliCompress);
const compressGzip = promisify(gzip);
const compressDeflate = promisify(deflate);
const sha256 = (body: Buffer) =>
  createHash("sha256").update(body).digest("hex");

async function writeFile(filePath: string, body: Buffer) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, body);
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

/** Build immutable API pages, then publish the local manifest last. */
export async function createPillDataPages(
  resources: readonly unknown[],
  directory = RESOURCE_DIRECTORY,
) {
  const limit = 5000;
  const pages = [];
  for (let current = 0; current < resources.length; current += limit) {
    const body = Buffer.from(
      JSON.stringify({
        resource: resources.slice(current, current + limit),
        total: resources.length,
        totalPage: Math.ceil(resources.length / limit),
        current,
      }),
    );
    const hash = sha256(body);
    const [br, gz, df] = await Promise.all([
      compressBrotli(body, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 6,
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
          [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
        },
      }),
      compressGzip(body, { level: 6 }),
      compressDeflate(body, { level: 6 }),
    ]);
    const files: Record<
      string,
      { path: string; bytes: number; sha256: string }
    > = {};
    for (const [encoding, bytes] of Object.entries({
      identity: body,
      br,
      gzip: gz,
      deflate: df,
    })) {
      const objectPath = `resource-pages/pill_data/${hash}.${encoding}`;
      await writeFile(path.join(directory, objectPath), bytes);
      files[encoding] = {
        path: objectPath,
        bytes: bytes.length,
        sha256: sha256(bytes),
      };
    }
    pages.push({
      bodyLength: body.length,
      etag: `W/"${createHash("sha256").update(body).digest("base64")}"`,
      files,
    });
  }
  const manifest = Buffer.from(
    JSON.stringify({
      format: 1,
      tables: {
        pill_data: { total: resources.length, pages: { [limit]: pages } },
      },
    }),
  );
  const manifestPath = `resource-pages/manifests/${sha256(manifest)}.json`;
  await writeFile(path.join(directory, manifestPath), manifest);
  await backupResourceFile("resource-pages/latest.json", directory);
  await writeFile(path.join(directory, "resource-pages/latest.json"), manifest);
}
