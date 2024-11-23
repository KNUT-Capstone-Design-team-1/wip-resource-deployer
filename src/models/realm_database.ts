import Realm from "realm";
import {
  DrugRecognitionSchema,
  FinishedMedicinePermissionDetailSchema,
} from "../schemas";

export class RealmDatabase {
  private static _instance: Realm;

  public static get() {
    return this._instance;
  }

  public static async initInstance(path: string): Promise<Realm> {
    if (!this._instance) {
      this._instance = await Realm.open({
        schema: [DrugRecognitionSchema, FinishedMedicinePermissionDetailSchema],
        path,
      });
    }

    return this._instance;
  }
}
