import type { AppConfig } from "./types/resource_tasks";
import fs from "fs";
import path from "path";
import defaultConfig from "../config.example.json";
import { PROJECT_ROOT } from "./utils/paths";

/**
 * 기존 설정을 보존하고, 최초 실행에만 기본 설정을 생성한다.
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
