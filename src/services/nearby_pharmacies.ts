import cp from "child_process";
import { TLoadedResource, TNearbyPharmaciesResource } from "../types";
import { logger, ResourceLoader } from "../utils";
import config from "../../config.json";

/**
 * D1 DB에 upsert 수행
 * @param nearbyPharmacies
 * @returns
 */
function upsert(
  nearbyPharmacies: TNearbyPharmaciesResource["nearbyPharmacies"]
) {
  let command = `wrangler d1 execute wip --remote --command "INSERT INTO NearbyPharmacies (id, name, states, region, district, postalCode, address, telephone, openData, x, y) VALUES `;

  const values: string[] = [];
  for (let i = 0; i < nearbyPharmacies.length; i += 1) {
    const queryValues = Object.values(nearbyPharmacies[i]).map((v) =>
      typeof v === "string" ? `'${v?.replace(/'/g, "''")}'` : v
    );

    values.push(`(${queryValues.join(",")})`);
  }

  if (!values.length) {
    logger.warn("No upsert values");
    return;
  }

  command += values.join(",");
  command += ` ON CONFLICT(id) DO UPDATE SET name = excluded.name, states = excluded.states, region = excluded.region, district = excluded.district, postalCode = excluded.postalCode, address = excluded.address, telephone = excluded.telephone, openData = excluded.openData, x = excluded.x, y = excluded.y`;
  command += `"`;

  cp.execSync(command, { encoding: "utf8", stdio: "inherit" });
}

/**
 * 주변 약국 데이터 업데이트
 * @param resource 리소스 데이터
 */
function updateNearbyPharmacies(resource: TLoadedResource) {
  const { maxRows } = config.nearbyPharmacies;

  const { nearbyPharmacies } = resource;

  let temp: TNearbyPharmaciesResource["nearbyPharmacies"] = [];
  for (let i = 0; i < nearbyPharmacies.length; i += 1) {
    temp.push(nearbyPharmacies[i]);

    if (temp.length === maxRows) {
      upsert(temp);
      temp = [];
    }
  }
}

/**
 * 주변 약국 리소스 배포
 */
export async function deployNearbyPharmaciesResource() {
  try {
    logger.info("[NEARBY-PHARMACIES] Start load resource");

    const resourceLoader = new ResourceLoader(["nearby_pharmacies"]);

    const resource = await resourceLoader.loadResource();

    logger.info("[NEARBY-PHARMACIES] Complete load resource");

    logger.info("[NEARBY-PHARMACIES] Start deploy nearby pharmacies data");

    updateNearbyPharmacies(resource);

    logger.info("[NEARBY-PHARMACIES] Complete deploy nearby pharmacies data");
  } catch (e) {
    logger.error(
      "[NEARBY-PHARMACIES] Failed to deploy nearby pharmacies data. %s",
      e.stack || e
    );
  }
}
