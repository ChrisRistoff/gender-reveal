import { DynamoDBStreamEvent } from "aws-lambda";
import { processGuesses } from "./revealProcessorService";

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
    return await processGuesses(event);
};
