import Realm from "realm";
import RealmDatabase from "./realm_database";
import { IFinishedMedicinePermissionDetails } from "../@types/finished_medicine_permission_details";
import { FINISHED_MEDICINE_PERMISSION_DETAILS, logger } from "../utils";

export class FinishedMedicinePermissionDetailModel {
  private readonly realm: Realm;
  private readonly collection: string;

  constructor() {
    this.realm = RealmDatabase.get();
    this.collection = FINISHED_MEDICINE_PERMISSION_DETAILS;
  }

  public readAll() {
    return this.realm.objects(this.collection);
  }

  public upsertMany(datas: Array<IFinishedMedicinePermissionDetails>) {
    for (let i = 0; i < datas.length; i += 1) {
      logger.info(datas[i]);
      this.upsert(datas[i]);
    }
  }

  public upsert(data: IFinishedMedicinePermissionDetails) {
    this.realm.write(() => {
      this.realm.create(
        FINISHED_MEDICINE_PERMISSION_DETAILS,
        data,
        Realm.UpdateMode.Modified
      );
    });
  }
}
