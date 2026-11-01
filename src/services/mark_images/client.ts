import axios from "axios";
import { encode } from "base64-arraybuffer";
import { retryRequest, RetryOptions } from "../../utils/retry";

/**
 * Base64 형식 검증
 */
export function isValidBase64(payload: string): boolean {
  const isInvalidLength = payload.length === 0 || payload.length % 4 !== 0;
  if (isInvalidLength) {
    return false;
  }

  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(
    payload,
  );
}

/**
 * 이미지 다운로드·변환
 */
async function downloadImage(url: string): Promise<string> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    maxContentLength: 5 * 1024 * 1024,
    headers: { Referer: "https://nedrug.mfds.go.kr/", Accept: "image/*" },
  });
  const contentType = String(response.headers["content-type"] ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  const isImage = contentType.startsWith("image/");
  if (!isImage) {
    throw new Error("Invalid image content type");
  }

  const base64 = encode(response.data);

  const isValidImage = isValidBase64(base64);
  if (!isValidImage) {
    throw new Error("Empty or invalid image response");
  }

  return "data:" + contentType + ";base64," + base64;
}

/**
 * 이미지 조회·재시도
 */
export function fetchImageBase64(
  url: string,
  options: RetryOptions = {},
): Promise<string> {
  return retryRequest(() => downloadImage(url), options);
}
