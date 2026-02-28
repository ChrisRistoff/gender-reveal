import { Genders, RevealStatus } from "./enums";

export type ResultError = {
    success: false,
    code: number,
    body: string
}

export type Scan = {
    userId: string;
    scanId: string;
    s3Key: string;
    gender: Genders | null;
    status: RevealStatus;
    year: string;
    createdAt: string;
    revealedAt?: string;
};
