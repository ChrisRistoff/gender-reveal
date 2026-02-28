import { ResultError } from "../commonTypes";

export type SubmitGuessInput = {
    scanId: string;
    userId: string;
    guess: string;
};

export type SubmitGuessResult =
    | { success: true }
    | ResultError
