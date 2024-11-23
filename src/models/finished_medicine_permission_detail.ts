import Realm from "realm";
import { RealmDatabase } from "./realm_database";
import { IFinishedMedicinePermissionDetail } from "../@types";
import { FINISHED_MEDICINE_PERMISSION_DETAIL } from "../utils";

export class FinishedMedicinePermissionDetailModel {
  private readonly database: Realm;
  private readonly collection: string;

  constructor() {
    this.database = RealmDatabase.get();
    this.collection = FINISHED_MEDICINE_PERMISSION_DETAIL;
  }

  public readAll() {
    return this.database.objects(
      this.collection
    ) as unknown as Array<IFinishedMedicinePermissionDetail>;
  }

  public upsertMany(datas: Array<IFinishedMedicinePermissionDetail>) {
    for (let i = 0; i < datas.length; i += 1) {
      this.upsert(datas[i]);
    }
  }

  public upsert(data: IFinishedMedicinePermissionDetail) {
    this.database.write(() => {
      this.database.create(
        FINISHED_MEDICINE_PERMISSION_DETAIL,
        data,
        Realm.UpdateMode.Modified
      );
    });
  }
}
