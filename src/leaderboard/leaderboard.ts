import { Client } from "pg";
import { SQSEvent } from "aws-lambda";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { GuessStatus } from "../enums";

const ssm = new SSMClient();

// fetching db url from ssm at runtime because neon is a third party service outside aws
// if we use aurora or rds we could use iam authentication instead
// and would not need to store or fetch credentials at all
const getDbUrl = async (): Promise<string> => {
    const result = await ssm.send(new GetParameterCommand({
        Name: "/scan-guess/db-url",
        WithDecryption: true,
    }));
    return result.Parameter!.Value!;
};

export const handler = async (event: SQSEvent): Promise<void> => {
    const dbUrl = await getDbUrl();
    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    try {
        for (const record of event.Records) {
            const snsEnvelope = JSON.parse(record.body);
            const { userId, status } = JSON.parse(snsEnvelope.Message);

            await client.query(
                `
                INSERT INTO leaderboard (user_id, correct_guesses, total_guesses, updated_at)
                VALUES ($1, $2, 1, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    correct_guesses = leaderboard.correct_guesses + $2,
                    total_guesses = leaderboard.total_guesses + 1,
                    updated_at = NOW()
                `
                , [userId, status === GuessStatus.Correct ? 1 : 0]
            );
        }
    } finally {
        await client.end();
    }
};
