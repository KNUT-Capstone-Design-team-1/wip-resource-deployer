/**
 * 주변 약국
 */
export interface INearbyPharmacies {
  id: string; // 암호화요양기호
  name: string; // 요양기관명
  states: string; // 시도코드명
  region: string; // 시군구코드명
  district: string; // 읍면동
  postalCode: string; // 우편번호
  address: string; // 주소
  telephone: string; // 전화번호
  openData: string; // 개설일자
  x: number; // 좌표(X)
  y: number; // 좌표(Y)
}

export type TNearbyPharmaciesRaw = {
  암호화요양기호: string;
  요양기관명: string;
  종별코드: string;
  종별코드명: string;
  시도코드: number;
  시도코드명: string;
  시군구코드: number;
  시군구코드명: string;
  읍면동: string;
  우편번호: number;
  주소: string;
  전화번호: string;
  개설일자: string;
  "좌표(X)": number;
  "좌표(Y)": number;
};

export type TNearbyPharmaciesResource = Record<
  "nearbyPharmacies",
  Array<INearbyPharmacies>
>;

export type TNearbyPharmaciesDirectoryName = "nearby_pharmacies";

export const NEARBY_PHARMACIES_PROPERTY_MAP = {
  암호화요양기호: "id",
  요양기관명: "name",
  시도코드명: "states",
  시군구코드명: "region",
  읍면동: "district",
  우편번호: "postalCode",
  주소: "address",
  전화번호: "telephone",
  개설일자: "openData",
  "좌표(X)": "x",
  "좌표(Y)": "y",
} as const;
