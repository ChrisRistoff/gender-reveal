import { Genders, RevealStatus } from "@shared/enums";
import { getScanById, createGuess } from "./submitGuessRepository";
import { SubmitGuessInput, SubmitGuessResult } from "./types";

export const submitGuess = async (input: SubmitGuessInput): Promise<SubmitGuessResult> => {
    const { scanId, userId, guess } = input;

    // validate guess
    if (!Object.values(Genders).includes(guess.toLowerCase() as Genders)) {
        return { success: false, code: 400, body: JSON.stringify({ message: "guess must be boy or girl" })};
    }

    // check the scan exists
    const scan = await getScanById(scanId);
    if (!scan) {
        return { success: false, code: 404, body: JSON.stringify({ message: "scan not found" })};
    }

    // can't guess revealed scan
    if (scan.status === RevealStatus.Revealed) {
        return { success: false, code: 409, body: JSON.stringify({ message: "this scan has already been revealed" })};
    }

    // can't guess on own scan
    if (scan.userId === userId) {
        return { success: false, code: 409, body: JSON.stringify({ message: "you cannot guess on your own scan" })};
    }

    // write the guess
    try {
        await createGuess(scanId, userId, guess.toLowerCase());
    } catch (err: any) {
        // dynamo throws err when the condition expression fails
        // meaning user already guessed on this scan
        if (err.name === "ConditionalCheckFailedException") {
            return { success: false, code: 409, body: JSON.stringify({ message: "you already guessed on this scan" })};
        }

        throw err;
    }

    return { success: true };
};
