import { ResourceLoader } from "../../infrastructure/resources/loader";
import { createResourceFile } from "../../infrastructure/resources/writer";
import logger from "../../shared/logging/logger";
import { TLoadedResource, TResourceDirectoryName } from "../../infrastructure/resources/types";
type CatalogName = Exclude<TResourceDirectoryName, "drug_recognition" | "finished_medicine_permission_detail">;
const catalogKeys: Record<CatalogName, keyof TLoadedResource> = {
  cannabis: "cannabis",
  narcotics: "narcotics",
  psychotropics: "psychotropics",
  prohibited_list: "prohibitedList",
  functional_food_nutrients: "functionalFoodNutrients",
};
export async function createCatalogResource(name: CatalogName): Promise<void> {
  logger.info("[%s] Start load resource", name);
  const resources = await new ResourceLoader([name]).loadResource();
  await createResourceFile(name + ".json", resources[catalogKeys[name]], false);
  logger.info("[%s] Complete create resource", name);
}
