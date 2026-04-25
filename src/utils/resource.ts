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
  PROHIBITED_LIST_PROPERTY_MAP,
  CATEGORY_MAP,
  CATEGORY_REGEX,
  IProhibitedList,
} from "../types";
import { createResourcesDirectory } from "./shared";
import { IPDFProcessorConfig } from "./pdf";

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
  prohibited_list: PROHIBITED_LIST_PROPERTY_MAP,
} as const;

/**
 * PDF 리소스용 설정
 */
export const PDF_RESOURCE_CONFIG: Record<string, IPDFProcessorConfig<any>> = {
  prohibited_list: {
    sectionRegex: CATEGORY_REGEX,
    promptGenerator: (content: string) => `
You are a strict medical substance extraction system specialized in anti-doping documents.

Your task is to extract prohibited substances with BOTH English and Korean names whenever possible.

CRITICAL RULES (VERY IMPORTANT):

1. Extract ONLY substance names from list-like lines.
   A valid list line must:
   - Look like a list entry (bullet, short line, or repeated pattern)
   - NOT be a full sentence (no verbs like "is", "are", "used")
   - Contain substance-like terms (chemical or drug names)

2. Korean mapping (VERY IMPORTANT):
   - The document contains BOTH English and Korean sections.
   - Korean sections are usually DIRECT translations.

   Mapping priority:
   a) Same line (best)
   b) Nearby Korean text
   c) SAME ORDER mapping (CRITICAL)

   If English and Korean lists appear separately:
   - Assume SAME ORDER
   - Map by index position

   STRICT RULE:
   - Do NOT map Korean randomly
   - Only map if clearly corresponding
   - If uncertain → genericKr = ""

3. Parentheses handling:
   - Extract only main English name
   - Ignore aliases
   - If Korean appears → use it

4. Do NOT invent translations.

5. Category extraction:
   - category: S1, S2, S3, etc.
   - categoryKr from Korean section
   - categoryEn from English section

6. Always:
   - inGameProhibited = true
   - outGameProhibited = true

7. Deduplicate.

8. Output STRICT JSON ONLY.

Text:
${content}
`,
    postProcessor: (items: any[], category?: string): IProhibitedList[] => {
      return items.map((item) => ({
        genericKr: item.genericKr,
        genericEn: item.genericEn,
        category: category as any,
        categoryKr: item.kr as any,
        categoryEn: item.en as any,
        inGameProhibited: item.inGame,
        outGameProhibited: item.outGame,
      }));
    },
  },
};

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
