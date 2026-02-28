import { ResultError } from "@shared/commonTypes";

export type EnsureNoScanResult = ResultError | { success: true };

export type UploadScanResult = {
    presignedUrl: string,
    scanId: string
}
