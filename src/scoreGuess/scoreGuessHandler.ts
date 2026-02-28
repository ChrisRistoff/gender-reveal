import { SQSEvent } from "aws-lambda";
import { scoreGuess } from "./scoreGuessService";

export const handler = async (event: SQSEvent): Promise<void> => {
    for (const record of event.Records) {
        // parse the message that revealProcessor dropped into the queue
        const { scanId, userId, guess, gender } = JSON.parse(record.body);

        await scoreGuess({ scanId, userId, guess, gender });
    }
};
