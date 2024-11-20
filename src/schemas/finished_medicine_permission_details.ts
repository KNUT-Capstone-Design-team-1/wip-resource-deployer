import Realm from "realm";

/**
 * 완제 의약품 허가 상세
 */
export interface IFinishedMedicinePermissionDetails {
  ITEM_SEQ: string; // 품목 일련 번호
  ITEM_NAME: string; // 품목명
  ENTP_NAME: string; // 업체명
  ITEM_PERMIT_DATE: string; // 허가 일자
  CNSGN_MANUF: string; // 위탁제조업체
  ETC_OTC_CODE: string; // 전문일반
  CHART: string; // 성상
  BAR_CODE: string; // 표준코드
  MATERIAL_NAME: string; // 원료 성분
  EE_DOC_ID: string; // 효능 효과 URL
  UD_DOC_ID: string; // 용법 용량 URL
  NB_DOC_ID: string; // 주의사항 URL
  INSERT_FILE: string; // 첨부 문서 URL
  VALID_TERM: string; // 유효 기간
  STORAGE_METHOD: string; // 저장 방법
  REEXAM_TARGET: string; // 재심사 대상
  REEXAM_DATE: string; // 재심사 기간
  PACK_UNIT: string; // 포장 단위
  EDI_CODE: string; // 보험 코드
  PERMIT_KIND: string; // 신고/허가구분
  ENTP_NO: string; // 업 허가 번호
  NARCOTIC_KIND: string; // 마약 종류 코드
  NEWDRUG_CLASS_NAME: string; // 신약
  INDUTY_TYPE: string; // 업종 구분
  MAIN_ITEM_INGR: string; // 주성분명
  INGR_NAME: string; // 첨가제명
}

export class FinishedMedicinePermissionDetailSchema extends Realm.Object<IFinishedMedicinePermissionDetails> {}
