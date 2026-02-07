import cp from "child_process";
import path from "path";
import fs from "fs";
import {
  TResourceDirectoryName,
  DRUG_RECOGNITION_PROPERTY_MAP,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  NEARBY_PHARMACIES_PROPERTY_MAP,
} from "../types";
import logger from "./logger";

export { logger };
export { MarkImageCrawler } from "./mark_image_crawler";
export { ResourceLoader } from "./resource_loader";

/**
 * 리소스 별 프로퍼티 맵
 */
export const RESOURCE_PROPERTY_MAP: Record<
  TResourceDirectoryName,
  | typeof DRUG_RECOGNITION_PROPERTY_MAP
  | typeof FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP
  | typeof NEARBY_PHARMACIES_PROPERTY_MAP
> = {
  drug_recognition: DRUG_RECOGNITION_PROPERTY_MAP,
  finished_medicine_permission_detail:
    FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  nearby_pharmacies: NEARBY_PHARMACIES_PROPERTY_MAP,
} as const;

/**
 * 객체 배열 내 객체 간 ID 값을 기준으로 중복되는 항목을 병합
 * @param idColumn ID 컬럼명
 * @param objectArray 병합 대상 객체 배열
 * @returns
 */
export function mergeDuplicateObjectArray(
  idColumn: string,
  objectArray: Array<Record<string, any>>,
) {
  const mergedMap = new Map();

  objectArray.forEach((object) => {
    const existing = mergedMap.get(object[idColumn]);

    if (!existing) {
      mergedMap.set(object[idColumn], { ...object });
      return;
    }

    for (const key in object) {
      if (key === idColumn) {
        continue;
      }

      const existValue = existing[key] ? existing[key].split(",") : [];
      const newValue = object[key] ? object[key].split(",") : [];

      existing[key] = Array.from(new Set([...existValue, ...newValue])).join(
        ",",
      );
    }

    mergedMap.set(object[idColumn], { ...existing });
  });

  return Array.from(mergedMap.values());
}

/**
 * wrangler에 쿼리 실행
 * @param query 실행할 쿼리
 * @returns
 */
export function runQuery(query: string) {
  const safeQuery = query.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  const command = `wrangler d1 execute wip --remote --command "${safeQuery}"`;

  return cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}

/**
 * 원천 데이터를 저장할 디렉터리 생성
 */
export function createResourcesDirectory() {
  const dirPath = path.resolve(__dirname, "../../resources");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 원천 데이터 파일 생성
 * @param resourceFileName 파일명
 * @param resourceData 원천 데이터
 */
export function createResourceFile(
  resourceFileName: string,
  resourceData: Record<string, any>[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(
      __dirname,
      `../../resources/${resourceFileName}`,
    );

    createResourcesDirectory();

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }

    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    stream.on("finish", resolve);
    stream.on("error", reject);

    stream.write('{"resources":[');

    resourceData.forEach((resource, index) => {
      if (index > 0) stream.write(",");
      stream.write(JSON.stringify(resource));
    });

    stream.write("]}");
    stream.end();
  });
}
