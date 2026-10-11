import { INearbyPharmacies, ISafemapPharmacyItem } from "./types";
type PharmacyItem = ISafemapPharmacyItem;
export function toPharmacy(item: PharmacyItem): INearbyPharmacies {
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
  return {
    id: item.num !== undefined && item.num !== null ? String(item.num) : "",
    name: item.dutyname ?? "",
    address: item.dutyaddr ?? "",
    telephone: item.dutytel1 ?? "",
    x: item.lon !== undefined && item.lon !== null ? Number(item.lon) : 0,
    y: item.lat !== undefined && item.lat !== null ? Number(item.lat) : 0,
    openTime: JSON.stringify(openTimeArray),
    closeTime: JSON.stringify(closeTimeArray),
  };
}
