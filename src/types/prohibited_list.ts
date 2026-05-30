/**
 * 도핑 금지 약물
 */
export interface IProhibitedList {
  contents: string;
}

export type TProhibitedListResource = Record<
  "prohibitedList",
  Array<IProhibitedList>
>;

export const PROHIBITED_LIST_PROPERTY_MAP = {
  contents: "contents",
} as const;
