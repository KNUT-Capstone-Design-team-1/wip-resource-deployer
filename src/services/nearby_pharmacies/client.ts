import fs from "fs";
import path from "path";
import axios from "axios";
import {
  INearbyPharmacies,
  ISafemapPharmacyResponse,
} from "./types/nearby_pharmacies";
import { toPharmacy } from "./transform";
import logger from "../../utils/logger";

/**
 * 환경 변수 또는 .env 파일에서 생활안전지도 약국 API 인증키 조회
 *
 * @returns OpenAPI 서비스 키 문자열
 */
function getApiKey() {
  const environmentKey = process.env.NEARBY_PHARMACIES_API_KEY?.trim();
  const hasEnvironmentKey = Boolean(environmentKey);

  if (hasEnvironmentKey) {
    return environmentKey!;
  }

  const envPath = path.resolve(process.cwd(), ".env");
  const hasEnvFile = fs.existsSync(envPath);

  if (!hasEnvFile) {
    throw new Error(
      "NEARBY_PHARMACIES_API_KEY is not defined in .env or environment variables",
    );
  }

  const match = fs
    .readFileSync(envPath, "utf8")
    .match(/NEARBY_PHARMACIES_API_KEY\s*=\s*(.+)/);
  const fileKey = match?.[1]?.trim();
  const hasFileKey = Boolean(fileKey);

  if (hasFileKey) {
    return fileKey!;
  }

  throw new Error(
    "NEARBY_PHARMACIES_API_KEY is not defined in .env or environment variables",
  );
}

/**
 * 약국 API의 한 페이지를 조회하고 변환된 약국 목록과 전체 건수를 반환한다.
 */
async function fetchPharmacyPage(
  url: string,
  serviceKey: string,
  pageNo: number,
) {
  logger.info("[NEARBY-PHARMACIES] Fetching page %s", pageNo);

  const response = await axios.get<ISafemapPharmacyResponse>(url, {
    params: { serviceKey, pageNo, numOfRows: 1000, returnType: "json" },
  });
  const body = response.data?.body;
  const hasBody = body !== undefined && body !== null;

  if (!hasBody) {
    logger.error(
      "[NEARBY-PHARMACIES] Unexpected response structure: %j",
      response.data,
    );

    return { pharmacies: [], totalCount: 0 };
  }

  return {
    pharmacies: (body.items?.item ?? []).map(toPharmacy),
    totalCount: body.totalCount ?? 0,
  };
}

/**
 * 약국 API를 페이지 단위로 조회해 전체 약국 목록을 수집한다.
 */
export async function fetchAllNearbyPharmacies(
  url = "http://safemap.go.kr/openapi2/IF_0048",
) {
  const key = getApiKey();
  const pharmacies: INearbyPharmacies[] = [];
  let pageNo = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const page = await fetchPharmacyPage(url, key, pageNo);

    page.pharmacies.forEach((pharmacy) => pharmacies.push(pharmacy));
    logger.info(
      "[NEARBY-PHARMACIES] Fetched %s / %s items (Page %s)",
      pharmacies.length,
      page.totalCount,
      pageNo,
    );
    hasMorePages =
      page.pharmacies.length > 0 && pharmacies.length < page.totalCount;
    pageNo += 1;
  }

  return pharmacies;
}
