import { TCannabisResource } from "../../services/cannabis/types/cannabis";
import { TNarcoticsResource } from "../../services/narcotics/types/narcotics";
import { TpsychotropicsResource } from "../../services/psychotropics/types/psychotropics";
import {
  IProhibitedList,
  TProhibitedListResource,
} from "../../services/prohibited_list/types/prohibited_list";

export type TResourceDirectoryName =
  "cannabis" | "narcotics" | "psychotropics" | "prohibited_list";

export type TLoadedResource = TCannabisResource &
  TNarcoticsResource &
  TpsychotropicsResource &
  TProhibitedListResource;

export type TResource = IProhibitedList;

/** 원본 디렉터리명과 로드 결과의 속성명을 명시적으로 연결한다. */
export const RESOURCE_KEYS = {
  cannabis: "cannabis",
  narcotics: "narcotics",
  psychotropics: "psychotropics",
  prohibited_list: "prohibitedList",
} as const satisfies Record<TResourceDirectoryName, keyof TLoadedResource>;
