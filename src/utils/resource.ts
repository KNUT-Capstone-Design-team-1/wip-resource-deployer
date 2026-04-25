import path from "path";
import fs from "fs";
import {
  TResourceDirectoryName,
  DRUG_RECOGNITION_PROPERTY_MAP,
  FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  NEARBY_PHARMACIES_PROPERTY_MAP,
  CANNABIS_PROPERTY_MAP,
  NARCOTICS_PROPERTY_MAP,
  psychotropics_PROPERTY_MAP,
} from "../types";

/**
 * 리소스 별 프로퍼티 맵
 */
export const RESOURCE_PROPERTY_MAP: Record<
  TResourceDirectoryName,
  Record<string, string>
> = {
  drug_recognition: DRUG_RECOGNITION_PROPERTY_MAP,
  finished_medicine_permission_detail:
    FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
  nearby_pharmacies: NEARBY_PHARMACIES_PROPERTY_MAP,
  cannabis: CANNABIS_PROPERTY_MAP,
  narcotics: NARCOTICS_PROPERTY_MAP,
  psychotropics: psychotropics_PROPERTY_MAP,
} as const;

/**
 * 원천 데이터를 저장할 디렉터리 생성
 */
function createResourcesDirectory() {
  const dirPath = path.resolve(__dirname, "../../resources");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 원천 데이터 파일 생성
 * @param resourceFileName 파일명
 * @param resourceData 원천 데이터
 * @param useStream 스트림 사용 여부
 */
export async function createResourceFile(
  resourceFileName: string,
  resourceData: Record<string, any>[],
  useStream: boolean,
) {
  const filePath = path.resolve(
    __dirname,
    `../../resources/${resourceFileName}`,
  );

  createResourcesDirectory();

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }

  if (!useStream) {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ resources: resourceData }, null, 2),
    );
    return;
  }

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    stream.on("finish", resolve);
    stream.on("error", reject);

    stream.write('{"resources":[');

    resourceData.forEach((resource, index) => {
      if (index > 0) {
        stream.write(",");
      }
      stream.write(JSON.stringify(resource));
    });

    stream.write("]}");
    stream.end();
  });
}
