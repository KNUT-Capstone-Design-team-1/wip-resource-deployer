import Realm from "realm";
import DrugRecognitionSchema from "src/schemas/drug_recognition";
import FinishedMedicinePermissionDetailSchema from "src/schemas/finished_medicine_permission_details";

export default class RealmDatabase {
  private static instance: Realm;

  public static async getInstance(): Promise<Realm> {
    if (!this.instance) {
      this.instance = await Realm.open({
        schema: [DrugRecognitionSchema, FinishedMedicinePermissionDetailSchema],
      });
    }

    return this.instance;
  }
}
