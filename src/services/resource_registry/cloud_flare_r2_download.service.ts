import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { PassThrough, Stream } from "stream";
import fs from "fs";
import path from "path";
import { DATABASE_DIRECTORY_NAME, logger } from "../../utils";
import { CloudFlareR2Client } from "./cloud_flare_r2_client";

export class CloudFlareDownloadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly resourcePath: string;

  constructor() {
    const { CLOUD_FLARE_RESOURCE_BUCKET } = process.env;

    this.client = CloudFlareR2Client.get();
    this.bucket = CLOUD_FLARE_RESOURCE_BUCKET as string;
    this.resourcePath = DATABASE_DIRECTORY_NAME;
  }

  public async downloadAllResources() {
    const resourceList = await this.getBucketList();

    if (!resourceList?.length) {
      logger.info("Resoure list is not exist in bucket");
      return;
    }

    for await (const resource of resourceList) {
      if (resource.Key) {
        await this.download(resource.Key as string);
      }
    }
  }

  private async getBucketList() {
    const command = new ListObjectsV2Command({ Bucket: this.bucket });
    const response = await this.client.send(command);
    return response.Contents;
  }

  private async download(fileName: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
    });
    const response = await this.client.send(command);
    await this.createFile(fileName, response.Body as Stream);
  }

  private async createFile(fileName: string, streamData: Stream) {
    if (!fs.existsSync(this.resourcePath)) {
      fs.mkdirSync(this.resourcePath);
    }

    const fileStream = fs.createWriteStream(
      path.join(this.resourcePath, `/current_${fileName}`)
    );

    const passThroughStream = new PassThrough();
    streamData.pipe(passThroughStream).pipe(fileStream);

    fileStream.on("finish", () => {
      logger.info("File downloaded successfully!");
    });

    fileStream.on("error", (err) => {
      logger.error("Error downloading file:", err);
    });
  }
}
