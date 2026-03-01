import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getGuessById } from "../../src/getGuess/getGuessRepository";
import { mockClient } from "aws-sdk-client-mock";

const dynamoMock = mockClient(DynamoDBDocumentClient);


describe('getGuess repository', () => {
    it('queries the correct table with the right keys', async () => {
        process.env.GUESSES_TABLE = 'test-guesses';

        dynamoMock.on(GetCommand).resolves({ Item: undefined });
        await getGuessById('scan1', 'user1');

        const calls = dynamoMock.commandCalls(GetCommand);
        expect(calls[0].args[0].input).toMatchObject({
            TableName: 'test-guesses',
            Key: { scanId: 'scan1', userId: 'user1' },
        });
    });

    it('throws if dynamo rejects', async () => {
        dynamoMock.on(GetCommand).rejects(new Error('dynamo error'));
        await expect(getGuessById('scan1', 'user1')).rejects.toThrow('dynamo error');
    });
})
