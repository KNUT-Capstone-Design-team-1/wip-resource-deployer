import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

/**
 * .env 설정 조회
 */
function readEnvFile(directory: string): NodeJS.Dict<string> {
  try {
    return parseEnv(
      fs.readFileSync(path.join(directory, ".env"), "utf8"),
    ) as Record<string, string>;
  } catch (error) {
    const isMissingFile = error.code === "ENOENT";
    if (isMissingFile) {
      return {};
    }

    throw new Error("Unable to read API credentials from .env");
  }
}

/**
 * API 인증키 조회
 */
export function getApiKey(name: string, directory = process.cwd()): string {
  const environmentKey = process.env[name]?.trim();
  const key = environmentKey || readEnvFile(directory)[name]?.trim();

  const isMissingKey = !key;
  if (isMissingKey) {
    throw new Error(name + " is not defined in .env or environment variables");
  }

  try {
    return decodeURIComponent(key);
  } catch {
    throw new Error(name + " contains invalid percent encoding");
  }
}
