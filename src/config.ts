import fs from "node:fs";
import path from "node:path";

import type { AppConfig } from "./types/resource_tasks";
import defaultConfig from "../config.example.json";
import { PROJECT_ROOT } from "./utils/paths";

/**
 * 설정 로드·기본값 생성
 */
export function loadConfig(filePath = path.join(PROJECT_ROOT, "config.json")) {
  const hasConfig = fs.existsSync(filePath);

  if (!hasConfig) {
    fs.writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2) + "\n", {
      encoding: "utf8",
      flag: "wx",
    });
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as AppConfig;
}
