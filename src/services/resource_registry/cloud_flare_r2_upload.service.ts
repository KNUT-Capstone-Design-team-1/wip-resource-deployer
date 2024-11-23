import { S3Client } from "@aws-sdk/client-s3";
import { CloudFlareR2Client } from "./cloud_flare_r2_client";

export class CloudflareUploadService {
  private readonly client: S3Client;

  constructor() {
    this.client = CloudFlareR2Client.get();
  }
}
