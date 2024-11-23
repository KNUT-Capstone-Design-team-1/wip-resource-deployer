import Realm from "realm";
import { RealmDatabase } from "./realm_database";
import { IDrugRecognition } from "../@types";
import { DRUG_RECOGNITION, logger } from "../utils";

export class DrugRecognitionModel {
  private readonly database: Realm;
  private readonly collection: string;

  constructor() {
    this.database = RealmDatabase.get();
    this.collection = DRUG_RECOGNITION;
  }

  public readAll() {
    return this.database.objects(this.collection);
  }

  public upsertMany(datas: Array<IDrugRecognition>) {
    for (let i = 0; i < datas.length; i += 1) {
      logger.info("Upsert of %s", datas[i]);
      this.upsert(datas[i]);
    }
  }

  public upsert(data: IDrugRecognition) {
    this.database.write(() => {
      this.database.create(DRUG_RECOGNITION, data, Realm.UpdateMode.Modified);
    });
  }
}
