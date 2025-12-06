import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";
import { Express } from "express";

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.configService.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.configService.get<string>("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn(
        "Cloudinary credentials not found. Upload functionality will not work.",
      );
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = "uploads",
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: folder,
          transformation: [
            {
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result || !result.secure_url) {
            reject(new Error("Failed to upload image: No result returned"));
          } else {
            resolve(result.secure_url);
          }
        },
      );

      // Upload file buffer to Cloudinary
      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(url: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = url.split("/");
      const filenameWithExt = urlParts[urlParts.length - 1];
      const filename = filenameWithExt.split(".")[0];
      const folder = urlParts[urlParts.length - 2];

      const publicId = folder ? `${folder}/${filename}` : filename;

      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
      // Don't throw error, just log it
    }
  }
}

