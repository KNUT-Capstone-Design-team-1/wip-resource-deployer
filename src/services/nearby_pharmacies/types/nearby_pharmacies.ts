/**
 * 생활안전지도 주변 약국 OpenAPI 단일 응답 아이템 인터페이스
 */
export interface ISafemapPharmacyItem {
  num?: number | string; // 순번/고유식별자
  dutyname?: string; // 약국명
  lon?: number | string; // 경도 (WGS84)
  lat?: number | string; // 위도 (WGS84)
  dutyaddr?: string; // 주소
  dutytel1?: string; // 대표 전화번호
  dutytime1s?: string | null; // 월요일 진료 시작 시간
  dutytime2s?: string | null; // 화요일 진료 시작 시간
  dutytime3s?: string | null; // 수요일 진료 시작 시간
  dutytime4s?: string | null; // 목요일 진료 시작 시간
  dutytime5s?: string | null; // 금요일 진료 시작 시간
  dutytime6s?: string | null; // 토요일 진료 시작 시간
  dutytime7s?: string | null; // 일요일 진료 시작 시간
  dutytime8s?: string | null; // 공휴일 진료 시작 시간
  dutytime1c?: string | null; // 월요일 진료 종료 시간
  dutytime2c?: string | null; // 화요일 진료 종료 시간
  dutytime3c?: string | null; // 수요일 진료 종료 시간
  dutytime4c?: string | null; // 목요일 진료 종료 시간
  dutytime5c?: string | null; // 금요일 진료 종료 시간
  dutytime6c?: string | null; // 토요일 진료 종료 시간
  dutytime7c?: string | null; // 일요일 진료 종료 시간
  dutytime8c?: string | null; // 공휴일 진료 종료 시간
  [key: string]: any;
}

/**
 * 생활안전지도 주변 약국 OpenAPI 응답 인터페이스
 */
export interface ISafemapPharmacyResponse {
  header?: {
    resultCode?: string;
    resultMsg?: string;
  };
  body?: {
    items?: {
      item?: ISafemapPharmacyItem[];
    };
    numOfRows?: number;
    pageNo?: number;
    totalCount?: number;
  };
}

/**
 * 포팅된 주변 약국 인터페이스
 */
export interface INearbyPharmacies {
  id: string; // num
  name: string; // dutyname
  address: string; // dutyaddr
  telephone: string; // dutytel1
  x: number; // lon
  y: number; // lat
  openTime: string; // dutytime1s ~ dutytime8s (인덱스 기준 0: 월요일, 7: 공휴일)
  closeTime: string; // dutytime1c ~ dutytime8c (인덱스 기준 0: 월요일, 7: 공휴일)
}

export type TNearbyPharmaciesResource = Record<
  "nearbyPharmacies",
  Array<INearbyPharmacies>
>;
