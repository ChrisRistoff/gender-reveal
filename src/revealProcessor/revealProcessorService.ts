import { DynamoDBStreamEvent } from "aws-lambda";
import { getGuessesById, publishGuessesForScoring } from "./revealProcessorRepository";
import { RevealStatus } from "../enums";

export const processGuesses = async (event: DynamoDBStreamEvent): Promise<void> => {
    for (const record of event.Records) {
        // only care about updates, reveal is an update
        if (record.eventName !== "MODIFY") continue;

        const newImage = record.dynamodb?.NewImage;
        const oldImage = record.dynamodb?.OldImage;

        if (!newImage || !oldImage) continue;

        // only fire when status changes from unrevealed to revealed
        const wasUnrevealed = oldImage.status?.S === RevealStatus.Unrevealed;
        const isNowRevealed = newImage.status?.S === RevealStatus.Revealed;

        if (!wasUnrevealed || !isNowRevealed) continue;

        const scanId = newImage.scanId?.S;
        const gender = newImage.gender?.S;

        if (!scanId || !gender) continue;

        // fetch all guesses for this scan
        const guesses = await getGuessesById(scanId);

        if (!guesses || !guesses.length) continue;

        // sqs batch send accepts max 10 messages at a time so we chunk the guesses
        const chunks = [];
        for (let i = 0; i < guesses.length; i += 10) {
            chunks.push(guesses.slice(i, i + 10));
        }

        // drop one sqs message per guess, scoreGuess lambda will pick them up
        for (const chunk of chunks) {
            await publishGuessesForScoring(chunk, scanId, gender);
        }
    }
}
