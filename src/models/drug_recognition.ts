import Realm from "realm";
import { RealmDatabase } from "./realm_database";
import { IDrugRecognition } from "../@types";
import { DRUG_RECOGNITION } from "../utils";

export class DrugRecognitionModel {
  private readonly database: Realm;
  private readonly collection: string;

  constructor(realmFilepath: string) {
    this.database = RealmDatabase.getInstance(realmFilepath);
    this.collection = DRUG_RECOGNITION;
  }

  public readAll() {
    return Array.from(
      this.database.objects(
        this.collection
      ) as unknown as Array<IDrugRecognition>
    );
  }

  public upsertMany(data: Array<IDrugRecognition>) {
    this.database.write(() => {
      for (let i = 0; i < data.length; i += 1) {
        this.database.create(DRUG_RECOGNITION, data[i], Realm.UpdateMode.Modified);
      }
    })
  }
}
