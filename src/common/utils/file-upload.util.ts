import { ConfigService } from "@nestjs/config";

/**
 * Get max file size for image uploads in bytes
 * Reads from MAX_IMAGE_SIZE_MB environment variable, defaults to 5MB
 */
export function getMaxImageSize(configService?: ConfigService): number {
  let maxSizeMB = 5; // default
  if (configService) {
    maxSizeMB = configService.get<number>("MAX_IMAGE_SIZE_MB", 5);
  } else {
    const envValue = process.env.MAX_IMAGE_SIZE_MB;
    if (envValue) {
      maxSizeMB = parseInt(envValue, 10) || 5;
    }
  }
  return maxSizeMB * 1024 * 1024; // Convert MB to bytes
}

/**
 * Get max file size for audio uploads in bytes
 * Reads from MAX_AUDIO_SIZE_MB environment variable, defaults to 10MB
 */
export function getMaxAudioSize(configService?: ConfigService): number {
  let maxSizeMB = 10; // default
  if (configService) {
    maxSizeMB = configService.get<number>("MAX_AUDIO_SIZE_MB", 10);
  } else {
    const envValue = process.env.MAX_AUDIO_SIZE_MB;
    if (envValue) {
      maxSizeMB = parseInt(envValue, 10) || 10;
    }
  }
  return maxSizeMB * 1024 * 1024; // Convert MB to bytes
}

