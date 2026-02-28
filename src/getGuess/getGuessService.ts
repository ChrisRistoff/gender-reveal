import { ResultError } from "../commonTypes";
import { getGuessById } from "./getGuessRepository"
import { Guess } from "./types";

type GetGuessResult = ResultError | { success: true, guess: Guess }

export const getUserGuessForScan = async (scanId: string, userId: string): Promise<GetGuessResult> => {
    const result = await getGuessById(scanId, userId);

    if (!result.Item) {
        return { success: false, code: 404, body: JSON.stringify({ message: "no guess found for this scan" }) };
    }

    return { success: true, guess: result.Item as Guess };
}
