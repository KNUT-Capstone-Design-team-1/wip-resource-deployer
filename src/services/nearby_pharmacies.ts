import fs from "fs";
import path from "path";
import axios from "axios";
import config from "../../config.json";
import { INearbyPharmacies, ISafemapPharmacyResponse } from "../types";
import { createResourceFile, logger } from "../utils";

/**
 * 환경 변수 또는 .env 파일에서 생활안전지도 약국 API 인증키 조회
 *
 * @returns OpenAPI 서비스 키 문자열
 */
function getApiKey(): string {
  if (process.env.NEARBY_PHARMACIES_API_KEY) {
    return process.env.NEARBY_PHARMACIES_API_KEY.trim();
  }

  const envPath = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/NEARBY_PHARMACIES_API_KEY\s*=\s*(.+)/);

    if (match && match[1]) {
      return match[1].trim();
    }
  }

  throw new Error(
    "NEARBY_PHARMACIES_API_KEY is not defined in .env or environment variables",
  );
}

/**
 * 생활안전지도 주변 약국 REST API를 호출하여 전체 약국 데이터를 페이징 수집 및 포팅
 *
 * @returns 포팅된 약국 데이터 배열 (Array<INearbyPharmacies>)
 */
export async function fetchAllNearbyPharmacies(): Promise<
  Array<INearbyPharmacies>
> {
  const serviceKey = getApiKey();
  const url =
    config.nearbyPharmacies?.apiUrl || "http://safemap.go.kr/openapi2/IF_0048";
  const numOfRows = 1000;

  let pageNo = 1;
  let totalCount = 0;
  const allPharmacies: Array<INearbyPharmacies> = [];

  do {
    logger.info(`[NEARBY-PHARMACIES] Fetching page ${pageNo}...`);

    const response = await axios.get<ISafemapPharmacyResponse>(url, {
      params: {
        serviceKey,
        pageNo,
        numOfRows,
        returnType: "json",
      },
    });

    const body = response.data?.body;

    if (!body) {
      logger.error(
        "[NEARBY-PHARMACIES] Unexpected response structure: %j",
        response.data,
      );
      break;
    }

    totalCount = body.totalCount ?? 0;
    const items = body.items?.item;

    if (!items || items.length === 0) {
      break;
    }

    for (const item of items) {
      // 인덱스 기준: 0은 월요일(dutytime1s), 7은 공휴일(dutytime8s)
      const openTimeArray = [
        item.dutytime1s ?? "",
        item.dutytime2s ?? "",
        item.dutytime3s ?? "",
        item.dutytime4s ?? "",
        item.dutytime5s ?? "",
        item.dutytime6s ?? "",
        item.dutytime7s ?? "",
        item.dutytime8s ?? "",
      ];

      // 인덱스 기준: 0은 월요일(dutytime1c), 7은 공휴일(dutytime8c)
      const closeTimeArray = [
        item.dutytime1c ?? "",
        item.dutytime2c ?? "",
        item.dutytime3c ?? "",
        item.dutytime4c ?? "",
        item.dutytime5c ?? "",
        item.dutytime6c ?? "",
        item.dutytime7c ?? "",
        item.dutytime8c ?? "",
      ];

      const pharmacy: INearbyPharmacies = {
        id: item.num !== undefined && item.num !== null ? String(item.num) : "",
        name: item.dutyname ?? "",
        address: item.dutyaddr ?? "",
        telephone: item.dutytel1 ?? "",
        x: item.lon !== undefined && item.lon !== null ? Number(item.lon) : 0,
        y: item.lat !== undefined && item.lat !== null ? Number(item.lat) : 0,
        openTime: JSON.stringify(openTimeArray),
        closeTime: JSON.stringify(closeTimeArray),
      };

      allPharmacies.push(pharmacy);
    }

    logger.info(
      `[NEARBY-PHARMACIES] Fetched ${allPharmacies.length} / ${totalCount} items (Page ${pageNo})`,
    );

    pageNo += 1;
  } while (allPharmacies.length < totalCount);

  return allPharmacies;
}

/**
 * 주변 약국 리소스 파일(nearby_pharmacies.json) 생성
 */
export async function createNearbyPharmaciesResource() {
  try {
    logger.info("[NEARBY-PHARMACIES] Start fetching nearby pharmacies from API");

    const nearbyPharmacies = await fetchAllNearbyPharmacies();

    logger.info(
      `[NEARBY-PHARMACIES] Successfully fetched ${nearbyPharmacies.length} nearby pharmacies`,
    );

    logger.info("[NEARBY-PHARMACIES] Start create nearby pharmacies data file");

    await createResourceFile(
      "nearby_pharmacies.json",
      nearbyPharmacies,
      false,
    );

    logger.info(
      "[NEARBY-PHARMACIES] Complete create nearby pharmacies data file",
    );
  } catch (e) {
    logger.error(
      "[NEARBY-PHARMACIES] Failed to create nearby pharmacies data. %s",
      e.stack || e,
    );
  }
}
