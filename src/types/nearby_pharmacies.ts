/**
 * 주변 약국
 */
export interface INearbyPharmacies {
  id: string; // 암호화요양기호
  name: string; // 요양기관명
  address: string; // 주소
  telephone: string; // 전화번호
  x: number; // 좌표(X)
  y: number; // 좌표(Y)
}

export type TNearbyPharmaciesResource = Record<
  "nearbyPharmacies",
  Array<INearbyPharmacies>
>;

export type TNearbyPharmaciesDirectoryName = "nearby_pharmacies";

export const NEARBY_PHARMACIES_PROPERTY_MAP = {
  암호화요양기호: "id",
  요양기관명: "name",
  주소: "address",
  전화번호: "telephone",
  "좌표(X)": "x",
  "좌표(Y)": "y",
} as const;

