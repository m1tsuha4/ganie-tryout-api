import { BadRequestException, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { existsSync, mkdirSync } from "fs";
import { ConfigService } from "@nestjs/config";
import { getMaxImageSize } from "../utils/file-upload.util";

const ensureDirExists = (folder: string) => {
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }
};

/**
 * Factory function untuk membuat UploadImageInterceptor
 * Menerima ConfigService untuk membaca MAX_IMAGE_SIZE_MB dari config
 */
export function UploadImageInterceptor(
  configService: ConfigService,
  folderName: string = "",
) {
  const folderPath = `./uploads/${folderName}`;

  ensureDirExists(folderPath);

  return UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, folderPath);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
          return cb(
            new BadRequestException("Only image files are allowed!"),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: getMaxImageSize(configService),
      },
    }),
  );
}
