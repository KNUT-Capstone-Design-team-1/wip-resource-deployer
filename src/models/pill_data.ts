import Realm from "realm";
import { RealmDatabase } from "./realm_database";
import { IPillData } from "../@types";
import { PILL_DATA } from "../utils";

export class PillDataModel {
  private readonly database: Realm;
  private readonly collection: string;

  constructor(realmFilepath: string) {
    this.database = RealmDatabase.getInstance(realmFilepath);
    this.collection = PILL_DATA;
  }

  public readAll() {
    return Array.from(
      this.database.objects(this.collection) as unknown as Array<IPillData>
    );
  }

  public upsertMany(data: Array<IPillData>) {
    this.database.write(() => {
      for (let i = 0; i < data.length; i += 1) {
        this.database.create(PILL_DATA, data[i], Realm.UpdateMode.Modified);
      }
    });
  }
}
