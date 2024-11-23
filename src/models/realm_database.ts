import Realm from "realm";
import {
  DrugRecognitionSchema,
  FinishedMedicinePermissionDetailSchema,
} from "../schemas";
import { convertStringToInt8Array } from "../utils";

export class RealmDatabase {
  private static _instance: Realm;

  public static get() {
    return this._instance;
  }

  public static async initInstance(path: string) {
    if (this._instance) {
      this._instance.close();
    }
  
    const config = {
      path,
      schema: [DrugRecognitionSchema, FinishedMedicinePermissionDetailSchema],
      encryptionKey: convertStringToInt8Array(process.env.REALM_ENCRYPTION_KEY as string),
    };

    this._instance = await Realm.open(config);
  }
}
