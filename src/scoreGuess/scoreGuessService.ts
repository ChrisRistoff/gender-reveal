import { GuessStatus } from "@shared/enums";
import { updateGuessStatus, publishGuessResult } from "./scoreGuessRepository";
import { ScoreGuessInput } from "./types";

// compare the guess against the gender, update dynamo, notify downstream
export const scoreGuess = async (input: ScoreGuessInput): Promise<void> => {
    const { scanId, userId, guess, gender } = input;

    // compare the guess
    const status = guess === gender ? GuessStatus.Correct : GuessStatus.Wrong;

    await updateGuessStatus(scanId, userId, status);
    await publishGuessResult({ scanId, userId, guess, gender, status });
};
