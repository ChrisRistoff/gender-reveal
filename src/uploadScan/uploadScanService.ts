import { EnsureNoScanResult, UploadScanResult } from "./types";
import { getPresignedScanUrl, getScanByUserAndYear, writeScanRecord } from "./uploadScanRepository";
import { randomUUID } from "crypto";

const currentYear = new Date().getFullYear().toString();

export const ensureNoScanLastYear = async (userId: string): Promise<EnsureNoScanResult> => {
    const scanForTheYear = await getScanByUserAndYear(userId, currentYear);

    if (scanForTheYear.Items && scanForTheYear.Items.length) {
        return { success: false, code: 409, body: JSON.stringify({ message: "you already uploaded a scan this year" })}
    }

    return { success: true };
}

export const uploadScanImage = async (userId: string): Promise<UploadScanResult> => {
    const scanId = randomUUID();

    //path of image in s3
    const s3Key = `scans/${userId}/${scanId}`;

    const presignedUrl = await getPresignedScanUrl(s3Key);

    const currentYear = new Date().getFullYear().toString();

    await writeScanRecord(userId, scanId, s3Key, currentYear);

    return { presignedUrl, scanId };
}
