import Realm from "realm";
import { RealmDatabase } from "./realm_database";
import { IFinishedMedicinePermissionDetail } from "../@types";
import { FINISHED_MEDICINE_PERMISSION_DETAIL } from "../utils";

export class FinishedMedicinePermissionDetailModel {
  private readonly database: Realm;
  private readonly collection: string;

  constructor(realmFilepath: string) {
    this.database = RealmDatabase.getInstance(realmFilepath);
    this.collection = FINISHED_MEDICINE_PERMISSION_DETAIL;
  }

  public readAll() {
    return Array.from(
      this.database.objects(
        this.collection
      ) as unknown as Array<IFinishedMedicinePermissionDetail>
    );
  }

  public upsertMany(data: Array<IFinishedMedicinePermissionDetail>) {
    this.database.write(() => {
      for (let i = 0; i < data.length; i += 1) {
        this.database.create(
          FINISHED_MEDICINE_PERMISSION_DETAIL,
          data[i],
          Realm.UpdateMode.Modified
        );
      }
    })
  }
}
