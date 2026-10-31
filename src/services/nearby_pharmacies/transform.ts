import { ISafemapPharmacyItem } from "./types/nearby_pharmacies";

/**
 * API 약국 정보를 리소스 구조로 변환하고 요일별 영업 시간을 JSON 문자열로 저장
 */
export function toPharmacy(item: ISafemapPharmacyItem) {
  // 인덱스 기준: 0은 월요일(dutytime1s), 7은 공휴일(dutytime8s)
  const openTimeArray = [
    item.dutytime1s ?? "",
    item.dutytime2s ?? "",
    item.dutytime3s ?? "",
    item.dutytime4s ?? "",
    item.dutytime5s ?? "",
    item.dutytime6s ?? "",
    item.dutytime7s ?? "",
    item.dutytime8s ?? "",
  ];

  // 인덱스 기준: 0은 월요일(dutytime1c), 7은 공휴일(dutytime8c)
  const closeTimeArray = [
    item.dutytime1c ?? "",
    item.dutytime2c ?? "",
    item.dutytime3c ?? "",
    item.dutytime4c ?? "",
    item.dutytime5c ?? "",
    item.dutytime6c ?? "",
    item.dutytime7c ?? "",
    item.dutytime8c ?? "",
  ];

  return createPharmacyRecord(item, openTimeArray, closeTimeArray);
}

/**
 * 약국 기본 정보와 영업 시간 레코드 생성
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
    name: item.dutyname ?? "",
    address: item.dutyaddr ?? "",
    telephone: item.dutytel1 ?? "",
    x: hasLongitude ? Number(item.lon) : 0,
    y: hasLatitude ? Number(item.lat) : 0,
    openTime: JSON.stringify(openTimeArray),
    closeTime: JSON.stringify(closeTimeArray),
  };
}

/**
 * null·undefined를 제외한 값의 존재 여부 확인
 */
function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}
