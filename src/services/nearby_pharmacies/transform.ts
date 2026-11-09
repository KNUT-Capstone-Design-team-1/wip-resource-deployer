import { ISafemapPharmacyItem } from "./types/nearby_pharmacies";

/**
 * 약국 API 응답 변환
 */
export function toPharmacy(item: ISafemapPharmacyItem) {
  const openTimeArray = readDutyTimes(item, "s");
  const closeTimeArray = readDutyTimes(item, "c");

  return createPharmacyRecord(item, openTimeArray, closeTimeArray);
}

/**
 * 약국 레코드 생성
 */
function createPharmacyRecord(
  item: ISafemapPharmacyItem,
  openTimeArray: string[],
  closeTimeArray: string[],
) {
  const hasIdentifier = hasValue(item.num);
  const hasLongitude = hasValue(item.lon);
  const hasLatitude = hasValue(item.lat);

  return {
    id: hasIdentifier ? String(item.num) : "",
    name: textValue(item.dutyname),
    address: textValue(item.dutyaddr),
    telephone: textValue(item.dutytel1),
    x: hasLongitude ? Number(item.lon) : 0,
    y: hasLatitude ? Number(item.lat) : 0,
    openTime: JSON.stringify(openTimeArray),
    closeTime: JSON.stringify(closeTimeArray),
  };
}

/**
 * 값 존재 여부 확인
 */
function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

/** 월요일부터 공휴일까지의 영업 시간. */
function readDutyTimes(item: ISafemapPharmacyItem, boundary: "s" | "c") {
  return Array.from({ length: 8 }, (_, index) =>
    textValue(item[`dutytime${index + 1}${boundary}`]),
  );
}

function textValue(value: string | null | undefined) {
  return value ?? "";
}
