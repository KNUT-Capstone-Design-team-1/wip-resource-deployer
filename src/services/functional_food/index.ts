import { createResourceFile } from "../../utils/resource_writer";
import logger from "../../utils/logger";
import { fetchAllFoodSafetyRows } from "./client";
import {
  createFunctionalFoodClassifications,
  createHealthFunctionalFoodRawMaterials,
} from "./transform";
import type { FoodSafetyClientOptions } from "./types";

/** 두 API의 전체 수집과 변환이 성공한 후에만 새 리소스를 저장한다. */
export async function createFunctionalFoodResources(
  options: FoodSafetyClientOptions = {},
) {
  logger.info("[FUNCTIONAL-FOOD] Start API collection");
  const classifications = createFunctionalFoodClassifications(
    await fetchAllFoodSafetyRows("I2710", options),
  );
  const products = createHealthFunctionalFoodRawMaterials(
    await fetchAllFoodSafetyRows("C003", options),
    classifications,
  );
  await createResourceFile(
    "functional_food_classification.json",
    classifications,
  );
  await createResourceFile(
    "health_functional_food_raw_material.json",
    products,
  );
  logger.info(
    "[FUNCTIONAL-FOOD] Completed classifications=%s products=%s",
    classifications.length,
    products.length,
  );
}
