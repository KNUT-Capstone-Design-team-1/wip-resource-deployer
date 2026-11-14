import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RESOURCE_DIRECTORY } from "./paths";

/** Keep an independent local copy before replacement or publication. */
export async function backupResourceFile(
  name: string,
  directory = RESOURCE_DIRECTORY,
) {
  if (
    !/^[a-z][a-z0-9_]*\.json$/.test(name) &&
    name !== "resource-pages/latest.json"
  ) {
    throw new Error("Invalid backup resource path");
  }
  let body: Buffer;
  try {
    body = await fs.readFile(path.join(directory, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const target = path.join(directory, "backups", stamp, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body, { flag: "wx" });
  return target;
}
