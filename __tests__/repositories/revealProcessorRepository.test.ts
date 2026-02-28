import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getGuessesById, GuessItem, publishGuessesForScoring } from "../../src/revealProcessor/revealProcessorRepository";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";

const dynamoMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

describe('revealProcessor repository', () => {
    beforeEach(() => {
        dynamoMock.reset();
        sqsMock.reset();

        process.env.GUESSES_TABLE = 'test-guesses';
        process.env.SCORE_GUESS_QUEUE_URL = 'test-guess-queue-url';
    })

    it('returns an empty array when Items is undefined', async () => {
        dynamoMock.on(QueryCommand).resolves({ Items: undefined });

        const res = await getGuessesById('234');

        expect(Array.isArray(res) && res.length === 0).toBe(true)
    });

    it('queries the correct table with the right scanId', async () => {
        dynamoMock.on(QueryCommand).resolves({});

        await getGuessesById('234')

        const calls = dynamoMock.commandCalls(QueryCommand);

        expect(calls[0].args[0].input).toMatchObject({
            TableName: 'test-guesses',
            KeyConditionExpression: "scanId = :scanId",
            ExpressionAttributeValues: { ":scanId": "234" },
        });
    });

    it("throws if dynamo rejects", async () => {
        dynamoMock.on(QueryCommand).rejects(new Error("dynamo error"));

        await expect(getGuessesById("324")).rejects.toThrow("dynamo error");
    });

    it('publishes the correct payload to sns', async () => {
        sqsMock.on(SendMessageBatchCommand).resolves({})

        const guessItem1 = { userId: '1', guess: 'girl' };
        const guessItem2 = { userId: '2', guess: 'boy' };

        const chunk: GuessItem[] = [guessItem1, guessItem2];

        await publishGuessesForScoring(chunk, '123', 'girl');

        const calls = sqsMock.commandCalls(SendMessageBatchCommand);

        expect(calls).toHaveLength(1);

        expect(calls[0].args[0].input).toMatchObject(
            {
                QueueUrl: 'test-guess-queue-url',
                Entries: [
                    {
                        Id: '1',
                        MessageBody: JSON.stringify({
                            scanId: '123',
                            ...guessItem1,
                            gender: 'girl'
                        })
                    },

                    {
                        Id: '2',
                        MessageBody: JSON.stringify({
                            scanId: '123',
                            ...guessItem2,
                            gender: 'girl'
                        })
                    }
                ]
            }
        )
    });

    it('throws if sqs rejects', async () => {
        sqsMock.on(SendMessageBatchCommand).rejects(new Error("sns error"))

        await expect(publishGuessesForScoring([], '123', 'girl')).rejects.toThrow("sns error");
    })
})
