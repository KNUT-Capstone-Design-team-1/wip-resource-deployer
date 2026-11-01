import axios from "axios";

/**
 * 민감 값·장문 오류 정리
 */
function sanitizeMessage(message: string): string {
  return message
    .replace(
      /(serviceKey|api[_-]?key|authorization|(?:access|refresh)[_-]?token|token)\s*[:=]\s*[^\s&,}]+/gi,
      "$1=[REDACTED]",
    )
    .replace(/https?:\/\/[^\s)]+/gi, (value) =>
      value.split("?")[0].replace(/\/\/[^/]*@/, "//[REDACTED]@"),
    )
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

/**
 * 안전한 오류 상세 생성
 */
export function describeError(error: unknown): string {
  const isHttpError = axios.isAxiosError(error);
  if (isHttpError) {
    return (
      "AxiosError code=" +
      (error.code ?? "unknown") +
      " status=" +
      (error.response?.status ?? "none")
    );
  }

  const isError = error instanceof Error;
  if (!isError) {
    return "Unknown error";
  }

  return sanitizeMessage(error.name + ": " + error.message);
}
