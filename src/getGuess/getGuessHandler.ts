import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getUserGuessForScan } from "./getGuessService";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get user id from cognito token
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "unauthorized" }),
        };
    }

    // get scanId from url
    const scanId = event.pathParameters?.scanId;

    if (!scanId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "scanId is required" }),
        };
    }

    // look up this user's guess for this specific scan
    const result = await getUserGuessForScan(scanId, userId);

    if (!result.success) {
        return {
            statusCode: result.code,
            body: result.body
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(result.guess),
    };
};
