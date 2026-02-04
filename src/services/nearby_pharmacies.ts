import { TLoadedResource, TNearbyPharmaciesResource } from "../types";
import { logger, ResourceLoader } from "../utils";
import config from "../../config.json";
import { runQuery } from "./util";

/**
 * 테이블 및 인덱스 / FTS5 생성
 */
function createTable() {
  const createTableQuery = `
  CREATE TABLE NearbyPharmacies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    states TEXT,
    region TEXT,
    district TEXT,
    postalCode TEXT,
    address TEXT,
    telephone TEXT,
    openData TEXT,
    x DOUBLE,
    y DOUBLE
  )`;
  runQuery(createTableQuery);

  const createCordinatesIndexQuery = `CREATE INDEX idx_pharmacies_xy ON NearbyPharmacies(x, y)`;
  runQuery(createCordinatesIndexQuery);

  const createFTS5Query = `
  CREATE VIRTUAL TABLE nearby_pharmacies_fts
  USING fts5(
    name,
    states,
    region,
    district,
    address,
    openData,
    content='NearbyPharmacies',
    content_rowid='rowid'
  )`;
  runQuery(createFTS5Query);
}

/**
 * 테이블 DROP
 */
function dropTable() {
  const dropTableQuery = `DROP TABLE IF EXISTS NearbyPharmacies`;
  runQuery(dropTableQuery);
}

/**
 * D1 DB에 insert 수행
 * @param nearbyPharmacies
 * @returns
 */
function insert(
  nearbyPharmacies: TNearbyPharmaciesResource["nearbyPharmacies"],
) {
  let insertQuery = `
  INSERT OR IGNORE INTO NearbyPharmacies (
    id, 
    name, 
    states, 
    region, 
    district, 
    postalCode, 
    address, 
    telephone, 
    openData, 
    x, 
    y
  ) VALUES `;

  const values: string[] = [];
  for (let i = 0; i < nearbyPharmacies.length; i += 1) {
    const queryValues = Object.values(nearbyPharmacies[i]).map((v) =>
      typeof v === "string" ? `'${v?.replace(/'/g, "''")}'` : v,
    );

    values.push(`(${queryValues.join(",")})`);
  }

  if (!values.length) {
    logger.warn("No insert values");
    return;
  }

  insertQuery += values.join(",");

  runQuery(insertQuery);
}

/**
 * 주변 약국 데이터 업데이트
 * @param resource 리소스 데이터
 */
function insertAll(resource: TLoadedResource) {
  const { maxRows } = config.nearbyPharmacies;

  const { nearbyPharmacies } = resource;

  let temp: TNearbyPharmaciesResource["nearbyPharmacies"] = [];
  for (let i = 0; i < nearbyPharmacies.length; i += 1) {
    temp.push(nearbyPharmacies[i]);

    if (temp.length === maxRows) {
      insert(temp);
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

    dropTable();
    createTable();
    insertAll(resource);

    logger.info("[NEARBY-PHARMACIES] Complete deploy nearby pharmacies data");
  } catch (e) {
    logger.error(
      "[NEARBY-PHARMACIES] Failed to deploy nearby pharmacies data. %s",
      e.stack || e,
    );
  }
}
