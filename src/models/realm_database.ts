import Realm from "realm";
import {
  DrugRecognitionSchema,
  FinishedMedicinePermissionDetailSchema,
} from "../schemas";
import { convertStringToInt8Array } from "../utils";

export class RealmDatabase {
  public static initInstance(realmFilepath: string) {
    const config = {
      path: realmFilepath,
      schema: [DrugRecognitionSchema, FinishedMedicinePermissionDetailSchema],
      encryptionKey: convertStringToInt8Array(process.env.REALM_ENCRYPTION_KEY as string),
    };
  
    return new Realm(config);
  }
}
