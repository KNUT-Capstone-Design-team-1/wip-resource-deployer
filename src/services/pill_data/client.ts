import axios from "axios";
import logger from "../../utils/logger";
import { getApiKey } from "../../utils/api_key";
import { retryRequest, RetryOptions } from "../../utils/retry";
import {
  parseApiPage,
  validatePageProgress,
  ApiItem,
  ApiPage,
} from "./api_response";
import { IMfdsApiResponse } from "./types/api";
import { IDrugRecognition } from "./types/drug_recognition";
import { IDrugProductPermissionDetail } from "./types/drug_product_permission_detail";

export const DRUG_RECOGNITION_API_URL =
  "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03";
export const DRUG_PRODUCT_PERMISSION_DETAIL_API_URL =
  "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08";

export interface ApiClientOptions {
  signal?: AbortSignal;
  retry?: RetryOptions;
}

/**
 * API 페이지 요청
 */
async function requestPage<T>(
  url: string,
  serviceKey: string,
  pageNo: number,
  options: ApiClientOptions,
): Promise<unknown> {
  const response = await axios.get<IMfdsApiResponse<T>>(url, {
    params: { serviceKey, pageNo, numOfRows: 100, type: "json" },
    timeout: 60000,
    signal: options.signal,
  });

  return response.data;
}

/**
 * API 페이지 조회·검증
 */
async function fetchPage<T extends ApiItem>(
  url: string,
  key: string,
  pageNo: number,
  label: string,
  options: ApiClientOptions,
): Promise<ApiPage<T>> {
  let data: unknown;

  try {
    data = await retryRequest(
      () => requestPage<T>(url, key, pageNo, options),
      options.retry,
    );
  } catch {
    // 인증키를 포함한 Axios 요청 설정과 원본 오류는 노출하지 않는다.
    throw new Error(label + " API request failed (page " + pageNo + ")");
  }

  return parseApiPage<T>(data, pageNo);
}

/**
 * 전체 API 페이지 수집
 */
async function fetchAllPages<T extends ApiItem>(
  url: string,
  key: string,
  label: string,
  options: ApiClientOptions,
): Promise<T[]> {
  const items: T[] = [];
  let expectedTotal: number | undefined;

  for (let pageNo = 1; ; pageNo += 1) {
    const page = await fetchPage<T>(url, key, pageNo, label, options);
    expectedTotal ??= page.totalCount;
    validatePageProgress(page, items.length, expectedTotal);
    page.items.forEach((item) => items.push(item));
    logger.info(
      "[PILL-DATA] Fetched %s: %s / %s (page %s)",
      label,
      items.length,
      expectedTotal,
      pageNo,
    );

    const isComplete = items.length === expectedTotal;
    if (isComplete) {
      return items;
    }
  }
}

/**
 * 전체 낱알식별 정보 수집
 */
export function fetchAllDrugRecognition(
  url = DRUG_RECOGNITION_API_URL,
  options: ApiClientOptions = {},
) {
  return fetchAllPages<IDrugRecognition>(
    url,
    getApiKey("DRUG_RECOGNITION_API_KEY"),
    "drug recognition",
    options,
  );
}

/**
 * 전체 제품 허가 상세 수집
 */
export function fetchAllDrugProductPermissionDetails(
  url = DRUG_PRODUCT_PERMISSION_DETAIL_API_URL,
  options: ApiClientOptions = {},
) {
  return fetchAllPages<IDrugProductPermissionDetail>(
    url,
    getApiKey("DRUG_PRODUCT_PERMISSION_DETAIL_API_KEY"),
    "drug product permission detail",
    options,
  );
}

/**
 * 알약 API 병렬 수집
 */
export async function fetchPillDataSources(
  drugRecognitionApiUrl?: string,
  drugProductPermissionDetailApiUrl?: string,
) {
  const controller = new AbortController();
  const options = { signal: controller.signal };

  try {
    const [drugRecognition, drugProductPermissionDetails] = await Promise.all([
      fetchAllDrugRecognition(drugRecognitionApiUrl || undefined, options),
      fetchAllDrugProductPermissionDetails(
        drugProductPermissionDetailApiUrl || undefined,
        options,
      ),
    ]);

    return { drugRecognition, drugProductPermissionDetails };
  } catch (error) {
    controller.abort();

    throw error;
  }
}
