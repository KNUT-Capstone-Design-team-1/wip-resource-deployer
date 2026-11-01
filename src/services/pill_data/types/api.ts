/** 식약처 OpenAPI의 JSON 페이지 응답. */
export interface IMfdsApiResponse<T> {
  header: { resultCode: string; resultMsg: string };
  body?: {
    items?: T[] | { item?: T | T[] | null } | null | "";
    numOfRows: number | string;
    pageNo: number | string;
    totalCount: number | string;
  };
}
