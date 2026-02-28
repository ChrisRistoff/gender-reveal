import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { submitGuess } from "./submitGuessService";
import { GuessStatus } from "@shared/enums";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get user id from cognito token
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
        return { statusCode: 401, body: JSON.stringify({ message: "unauthorized" }) };
    }

    const scanId = event.pathParameters?.scanId;
    if (!scanId) {
        return { statusCode: 400, body: JSON.stringify({ message: "scanId is required" }) };
    }

    const body = JSON.parse(event.body ?? "{}");
    const { guess } = body;
    if (!guess) {
        return { statusCode: 400, body: JSON.stringify({ message: "guess is required" }) };
    }

    const result = await submitGuess({ scanId, userId, guess });

    if (!result.success) {
        return { statusCode: result.code, body: result.body };
    }

    return { statusCode: 201, body: JSON.stringify({ scanId, userId, status: GuessStatus.Pending }) };
};
