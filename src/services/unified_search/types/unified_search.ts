import type { IPillData } from "../../pill_data/types/pill_data";
import type { PILL_DATA_COLUMNS } from "../columns";

/** 검색 생성에 사용하는 알약 리소스의 필드만 의존한다. */
export type SearchPill = Pick<
  IPillData,
  "ITEM_SEQ" | (typeof PILL_DATA_COLUMNS)[number]
>;

/**
 * 통합 검색 데이터
 */
export interface IUnifiedSearchData {
  ITEM_SEQ: string;
  CONTENTS: string;
}
