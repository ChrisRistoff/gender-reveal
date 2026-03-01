import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { getAllScans } from "../../src/getScans/getScansRepository";

const dynamoMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);

describe('getScans repository', () => {
    beforeEach(() => {
        dynamoMock.reset();
        s3Mock.reset();
        process.env.SCANS_TABLE = 'test-scans';
    });

    describe('getAllScans', () => {
        it('scans the correct table', async () => {
            dynamoMock.on(ScanCommand).resolves({ Items: [] });
            await getAllScans();

            const calls = dynamoMock.commandCalls(ScanCommand);
            expect(calls[0].args[0].input).toMatchObject({
                TableName: 'test-scans',
            });
        });

        it('returns empty array when no items found', async () => {
            dynamoMock.on(ScanCommand).resolves({ Items: [] });
            const result = await getAllScans();
            expect(result).toEqual([]);
        });

        it('throws if dynamo rejects', async () => {
            dynamoMock.on(ScanCommand).rejects(new Error('dynamo error'));
            await expect(getAllScans()).rejects.toThrow('dynamo error');
        });
    });
});
