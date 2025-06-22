import path from "path";
import { TResourceDirectoryName } from "src/@types";

export const DATABASE_DIRECTORY_NAME = "./database_resource";

export const INITIAL_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/initial.realm`
);
export const UPDATE_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/update.realm`
);

export const CURRENT_INITIAL_REALM_FILE_NAME = path.join(
  `${DATABASE_DIRECTORY_NAME}/current_initial.realm`
);

export const FINISHED_MEDICINE_PERMISSION_DETAIL =
  "FinishedMedicinePermissionDetail";

export const PILL_DATA = "PillData";

export const DRUG_RECOGNITION_PROPERTY_MAP = {
  품목일련번호: "ITEM_SEQ",
  품목명: "ITEM_NAME",
  업소일련번호: "ENTP_SEQ",
  업소명: "ENTP_NAME",
  큰제품이미지: "ITEM_IMAGE",
  표시앞: "PRINT_FRONT",
  표시뒤: "PRINT_BACK",
  의약품제형: "DRUG_SHAPE",
  색상앞: "COLOR_CLASS1",
  색상뒤: "COLOR_CLASS2",
  분할선앞: "LINE_FRONT",
  분할선뒤: "LINE_BACK",
  "이미지생성일자(약학정보원)": "IMG_REGIST_TS",
  분류명: "CLASS_NAME",
  전문일반구분: "ETC_OTC_CODE",
  품목허가일자: "ITEM_PERMIT_DATE",
  표기코드앞: "MARK_CODE_FRONT",
  표기코드뒤: "MARK_CODE_BACK",
  제형코드: "FORM_CODE",
} as const;

export const FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP = {
  품목일련번호: "ITEM_SEQ",
  품목명: "ITEM_NAME",
  업체명: "ENTP_NAME",
  허가일자: "ITEM_PERMIT_DATE",
  전문일반: "ETC_OTC_CODE",
  성상: "CHART",
  표준코드: "BAR_CODE",
  원료성분: "MATERIAL_NAME",
  유효기간: "VALID_TERM",
  저장방법: "STORAGE_METHOD",
  포장단위: "PACK_UNIT",
  주성분명: "MAIN_ITEM_INGR",
  첨가제명: "INGR_NAME",
} as const;

export const RESOURCE_PROPERTY_MAP: Record<
  TResourceDirectoryName,
  | typeof DRUG_RECOGNITION_PROPERTY_MAP
  | typeof FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP
> = {
  drug_recognition: DRUG_RECOGNITION_PROPERTY_MAP,
  finished_medicine_permission_detail:
    FINISHED_MEDICINE_PERMISSION_PROPERTY_MAP,
} as const;
