import fs from "fs";
import path from "path";
import axios from "axios";
import { INearbyPharmacies, ISafemapPharmacyResponse } from "./types";
import { toPharmacy } from "./transform";
import logger from "../../shared/logging/logger";
/**
 * 환경 변수 또는 .env 파일에서 생활안전지도 약국 API 인증키 조회
 *
 * @returns OpenAPI 서비스 키 문자열
 */
function getApiKey(): string {
  const environmentKey = process.env.NEARBY_PHARMACIES_API_KEY?.trim();
  const hasEnvironmentKey = Boolean(environmentKey);
  if (hasEnvironmentKey) {
    return environmentKey!;
  }
  const envPath = path.resolve(process.cwd(), ".env");
  const hasEnvFile = fs.existsSync(envPath);
  if (!hasEnvFile) {
    throw new Error("NEARBY_PHARMACIES_API_KEY is not defined in .env or environment variables");
  }
  const match = fs.readFileSync(envPath, "utf8")
    .match(/NEARBY_PHARMACIES_API_KEY\s*=\s*(.+)/);
  const fileKey = match?.[1]?.trim();
  const hasFileKey = Boolean(fileKey);
  if (hasFileKey) {
    return fileKey!;
  }
  throw new Error("NEARBY_PHARMACIES_API_KEY is not defined in .env or environment variables");
}
/**
 * 생활안전지도 주변 약국 REST API를 호출하여 전체 약국 데이터를 페이징 수집 및 포팅
 *
 * @returns 포팅된 약국 데이터 배열 (Array<INearbyPharmacies>)
 */
interface PharmacyPage {
  pharmacies: INearbyPharmacies[];
  totalCount: number;
}
async function fetchPharmacyPage(url: string, serviceKey: string, pageNo: number): Promise<PharmacyPage> {
  logger.info("[NEARBY-PHARMACIES] Fetching page %s", pageNo);
  const response = await axios.get<ISafemapPharmacyResponse>(url, {
    params: { serviceKey, pageNo, numOfRows: 1000, returnType: "json" },
  });
  const body = response.data?.body;
  const hasBody = body !== undefined && body !== null;
  if (!hasBody) {
    logger.error("[NEARBY-PHARMACIES] Unexpected response structure: %j", response.data);
    return { pharmacies: [], totalCount: 0 };
  }
  return {
    pharmacies: (body.items?.item ?? []).map(toPharmacy),
    totalCount: body.totalCount ?? 0,
  };
}
export async function fetchAllNearbyPharmacies(
  url = "http://safemap.go.kr/openapi2/IF_0048",
): Promise<INearbyPharmacies[]> {
  const key = getApiKey();
  const pharmacies: INearbyPharmacies[] = [];
  let pageNo = 1;
  let hasMorePages = true;
  while (hasMorePages) {
    const page = await fetchPharmacyPage(url, key, pageNo);
    page.pharmacies.forEach((pharmacy) => pharmacies.push(pharmacy));
    logger.info("[NEARBY-PHARMACIES] Fetched %s / %s items (Page %s)", pharmacies.length, page.totalCount, pageNo);
    hasMorePages = page.pharmacies.length > 0 && pharmacies.length < page.totalCount;
    pageNo += 1;
  }
  return pharmacies;
}
