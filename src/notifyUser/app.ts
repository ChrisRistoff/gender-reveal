import { SQSEvent } from "aws-lambda";

export const handler = async (event: SQSEvent): Promise<void> => {
    for (const record of event.Records) {
        // so we need to unwrap twice, first the sqs record, then the sns envelope
        const snsEnvelope = JSON.parse(record.body);
        const { scanId, userId, guess, gender, status } = JSON.parse(snsEnvelope.Message);

        console.log(`user ${userId} guessed ${guess} on scan ${scanId} — actual gender was ${gender} — result: ${status}`);

        // TODO: plug in SES here to send an actual email to the user
    }
};
