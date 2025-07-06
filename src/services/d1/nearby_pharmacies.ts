import cp from "child_process";
import { TLoadedResource } from "src/@types/resource";
import config from "../../../config.json";
import { TNearbyPharmaciesResource } from "src/@types/d1/nearby_pharmacies";
import { logger } from "../../utils";

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

export function updateNearbyPharmacies(resource: TLoadedResource) {
  const { maxRows } = config;

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
