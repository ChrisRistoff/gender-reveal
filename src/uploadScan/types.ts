import { ResultError } from "../commonTypes";

export type EnsureNoScanResult = ResultError | { success: true };

export type UploadScanResult = {
    presignedUrl: string,
    scanId: string
}
