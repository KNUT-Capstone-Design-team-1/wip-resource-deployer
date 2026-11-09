import axios from "axios";
import { sleep } from "../../utils/delay";
import { isRecord } from "../../utils/guards";
import { getApiKey } from "../../utils/api_key";
import logger from "../../utils/logger";
import type {
  FoodSafetyClientOptions,
  FoodSafetyRow,
  FoodSafetyService,
} from "./types";

type FoodSafetyPage = { rows: FoodSafetyRow[]; total: number };

function record(value: unknown) {
  return isRecord(value) ? value : undefined;
}

function validateRows(
  rows: unknown,
  total: number,
  service: FoodSafetyService,
): asserts rows is FoodSafetyRow[] {
  const validTotal = Number.isSafeInteger(total) && total >= 0;
  const validRows = Array.isArray(rows) && rows.every(isRecord);
  if (!validTotal || !validRows) {
    throw new Error(service + " API response has invalid rows or total_count");
  }
}

/** 정상 응답과 API 오류를 구분한다. */
export function parseFoodSafetyPage(
  data: unknown,
  service: FoodSafetyService,
): FoodSafetyPage {
  const envelope = record(data);
  const body = record(envelope?.[service]);
  const result = record(body?.RESULT ?? envelope?.RESULT);
  if (result?.CODE === "INFO-200") return { rows: [], total: 0 };
  requireSuccessfulBody(body, result, service);
  const total = Number(body.total_count);
  const rows = body.row ?? [];
  validateRows(rows, total, service);
  return { rows, total };
}

function requireSuccessfulBody(
  body: Record<string, unknown> | undefined,
  result: Record<string, unknown> | undefined,
  service: FoodSafetyService,
): asserts body is Record<string, unknown> {
  if (!body || result?.CODE !== "INFO-000") {
    throw new Error(
      service +
        " API response failed: " +
        String(result?.CODE ?? "invalid_response"),
    );
  }
}

function pagination(options: FoodSafetyClientOptions) {
  const pageSize = options.pageSize ?? 1000;
  const delay = options.requestDelayMs ?? 1000;
  validatePageSize(pageSize);
  if (!Number.isFinite(delay) || delay < 0)
    throw new Error("Invalid functional food pagination options");
  return { pageSize, delay };
}

function validatePageSize(pageSize: number) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error("Invalid functional food pagination options");
  }
}

function createPageFetcher(
  options: FoodSafetyClientOptions,
): NonNullable<FoodSafetyClientOptions["fetchPage"]> {
  if (options.fetchPage) return options.fetchPage;
  const key = options.apiKey ?? getApiKey("FOOD_SAFETY_KOREA_API_KEY");
  const baseUrl = (
    options.apiUrl ?? "http://openapi.foodsafetykorea.go.kr/api"
  ).replace(/\/$/, "");
  return async (service, start, end) => {
    try {
      const url = [
        baseUrl,
        encodeURIComponent(key),
        service,
        "json",
        start,
        end,
      ].join("/");
      return (await axios.get(url, { timeout: 30000 })).data;
    } catch {
      // 인증키가 포함된 URL과 Axios 오류 객체를 노출하지 않는다.
      throw new Error(service + " API request failed at index " + start);
    }
  };
}

function appendPage(
  rows: FoodSafetyRow[],
  page: FoodSafetyPage,
  total: number,
  start: number,
  pageSize: number,
  service: FoodSafetyService,
) {
  if (
    page.total !== total ||
    page.rows.length !== Math.min(pageSize, total - start + 1)
  ) {
    throw new Error(
      service +
        " API returned an incomplete or changing dataset; rerun collection",
    );
  }
  rows.push(...page.rows);
  logger.info(
    "[FUNCTIONAL-FOOD] service=%s collected=%s total=%s",
    service,
    rows.length,
    total,
  );
}

function requireRows(rows: FoodSafetyRow[], service: FoodSafetyService) {
  if (rows.length === 0)
    throw new Error(
      service + " API returned no data; existing resources preserved",
    );
  return rows;
}

/** 식품안전나라 인덱스는 1부터 시작하며 끝 인덱스를 포함한다. */
export async function fetchAllFoodSafetyRows(
  service: FoodSafetyService,
  options: FoodSafetyClientOptions = {},
) {
  const { pageSize, delay } = pagination(options);
  const wait = options.wait ?? sleep;
  const fetchPage = createPageFetcher(options);
  const first = parseFoodSafetyPage(
    await fetchPage(service, 1, pageSize),
    service,
  );
  const rows: FoodSafetyRow[] = [];
  appendPage(rows, first, first.total, 1, pageSize, service);
  for (let start = pageSize + 1; start <= first.total; start += pageSize) {
    await wait(delay);
    const page = parseFoodSafetyPage(
      await fetchPage(service, start, start + pageSize - 1),
      service,
    );
    appendPage(rows, page, first.total, start, pageSize, service);
  }
  return requireRows(rows, service);
}
