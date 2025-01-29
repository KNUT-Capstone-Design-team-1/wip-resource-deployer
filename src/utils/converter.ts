// res 데이터 Header Map
// DB에 사용할 데이터는 여기에 추가
const resHeaderDrugRecog: Record<string, string> = {
  '품목일련번호': 'ITEM_SEQ',
  '품목명': 'ITEM_NAME',
  '업소일련번호': 'ENTP_SEQ',
  '업소명': 'ENTP_NAME',
  '큰제품이미지': 'ITEM_IMAGE',
  '표시앞': 'PRINT_FRONT',
  '표시뒤': 'PRINT_BACK',
  '의약품제형': 'DRUG_SHAPE',
  '색상앞': 'COLOR_CLASS1',
  '색상뒤': 'COLOR_CLASS2',
  '분할선앞': 'LINE_FRONT',
  '분할선뒤': 'LINE_BACK',
  '이미지생성일자(약학정보원)': 'IMG_REGIST_TS',
  '분류명': 'CLASS_NAME',
  '전문일반구분': 'ETC_OTC_CODE',
  '품목허가일자': 'ITEM_PERMIT_DATE',
}

const resHeaderFinished: Record<string, string> = {
  '품목일련번호': 'ITEM_SEQ',
  '품목명': 'ITEM_NAME',
  '업체명': 'ENTP_NAME',
  '허가일자': 'ITEM_PERMIT_DATE',
  '전문일반': 'ETC_OTC_CODE',
  '성상': 'CHART',
  '표준코드': 'BAR_CODE',
  '원료성분': 'MATERIAL_NAME',
  '유효기간': 'VALID_TERM',
  '저장방법': 'STORAGE_METHOD',
  '포장단위': 'PACK_UNIT',
  '주성분명': 'MAIN_ITEM_INGR',
  '첨가제명': 'INGR_NAME',
}

// PRINT_FRONT + PRINT_BACK => vector (유니코드 벡터)
const maxTextLength = 29

const textToVector = (text: string) => {
  const vector = new Array<number>(maxTextLength).fill(0)

  for (let i = 0; i < text.length; i++) {
    vector[i] = text.charCodeAt(i)
  }

  return vector
}

const headerKeyMap: Record<string, Record<string, string>> = {
  'pill_data': resHeaderDrugRecog,
  'finished_medicine_permission_detail': resHeaderFinished
}

export { headerKeyMap, textToVector }