import axios from "axios";
import { getApiKey } from "../../utils/api_key";
import logger from "../../utils/logger";
import type {
  FoodSafetyClientOptions,
  FoodSafetyRow,
  FoodSafetyService,
} from "./types";

/** 정상 응답만 해석하고 인증 오류나 구조 오류를 빈 데이터와 구분한다. */
export function parseFoodSafetyPage(data: unknown, service: FoodSafetyService) {
  const envelope = data as Record<string, any> | null;
  const body = envelope?.[service];
  const result = body?.RESULT ?? envelope?.RESULT;
  if (result?.CODE === "INFO-200") {
    return { rows: [] as FoodSafetyRow[], total: 0 };
  }
  if (!body || result?.CODE !== "INFO-000") {
    throw new Error(
      service +
        " API response failed: " +
        String(result?.CODE ?? "invalid_response"),
    );
  }
  const total = Number(body.total_count);
  const rows = body.row ?? [];
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Array.isArray(rows) ||
    rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))
  ) {
    throw new Error(service + " API response has invalid rows or total_count");
  }
  return { rows: rows as FoodSafetyRow[], total };
}

/** 식품안전나라 인덱스는 1부터 시작하며 끝 인덱스를 포함한다. */
export async function fetchAllFoodSafetyRows(
  service: FoodSafetyService,
  options: FoodSafetyClientOptions = {},
) {
  const pageSize = options.pageSize ?? 1000;
  const delay = options.requestDelayMs ?? 1000;
  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 1000 ||
    !Number.isFinite(delay) ||
    delay < 0
  ) {
    throw new Error("Invalid functional food pagination options");
  }
  const wait =
    options.wait ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const key = options.fetchPage
    ? ""
    : (options.apiKey ?? getApiKey("FOOD_SAFETY_KOREA_API_KEY"));
  const baseUrl = (
    options.apiUrl ?? "http://openapi.foodsafetykorea.go.kr/api"
  ).replace(/\/$/, "");
  const fetchPage =
    options.fetchPage ??
    (async (svc, start, end) => {
      try {
        return (
          await axios.get(
            baseUrl +
              "/" +
              encodeURIComponent(key) +
              "/" +
              svc +
              "/json/" +
              start +
              "/" +
              end,
            { timeout: 30000 },
          )
        ).data;
      } catch {
        // 인증키가 URL에 있으므로 Axios 오류 객체나 요청 URL을 로그에 노출하지 않는다.
        throw new Error(svc + " API request failed at index " + start);
      }
    });
  const rows: FoodSafetyRow[] = [];
  let total: number | undefined;
  for (
    let start = 1;
    total === undefined || start <= total;
    start += pageSize
  ) {
    if (start > 1) await wait(delay);
    const page = parseFoodSafetyPage(
      await fetchPage(service, start, start + pageSize - 1),
      service,
    );
    total ??= page.total;
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
  if (rows.length === 0)
    throw new Error(
      service + " API returned no data; existing resources preserved",
    );
  return rows;
}
