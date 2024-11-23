import Realm from "realm";
import { RealmDatabase } from "./realm_database";
import { IDrugRecognition } from "../@types";
import { DRUG_RECOGNITION } from "../utils";

export class DrugRecognitionModel {
  private readonly database: Realm;
  private readonly collection: string;

  constructor(realmFilepath: string) {
    this.database = RealmDatabase.initInstance(realmFilepath);
    this.collection = DRUG_RECOGNITION;
  }

  public readAll() {
    return Array.from(
      this.database.objects(
        this.collection
      ) as unknown as Array<IDrugRecognition>
    );
  }

  public upsertMany(datas: Array<IDrugRecognition>) {
    for (let i = 0; i < datas.length; i += 1) {
      this.upsert(datas[i]);
    }
  }

  public upsert(data: IDrugRecognition) {
    this.database.write(() => {
      this.database.create(DRUG_RECOGNITION, data, Realm.UpdateMode.Modified);
    });
  }
}
