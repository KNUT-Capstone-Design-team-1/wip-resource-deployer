import Realm from "realm";
import {
  PillDataSchema,
  FinishedMedicinePermissionDetailSchema,
} from "../schemas";
import { convertStringToInt8Array } from "../utils";

export class RealmDatabase {
  public static getInstance(realmFilepath: string): Realm {
    const config = {
      path: realmFilepath,
      schema: [PillDataSchema, FinishedMedicinePermissionDetailSchema],
      encryptionKey: convertStringToInt8Array(process.env.REALM_ENCRYPTION_KEY as string),
    };
  
    return new Realm(config);
  }
}
