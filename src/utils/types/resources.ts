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
