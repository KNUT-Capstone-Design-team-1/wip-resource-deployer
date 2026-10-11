/**
 * 통합 검색 데이터
 */
export interface IUnifiedSearchData {
  ITEM_SEQ: string;
  CONTENTS: string;
}

export interface IStatsResult {
  minRowId: number;
  maxRowId: number;
  totalCount: number;
}
