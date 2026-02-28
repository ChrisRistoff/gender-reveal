import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RevealStatus } from "../enums";
import { updateScanGender } from "./revealGenderService";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get user from cognito
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "unauthorized" }),
        };
    }

    // get scan id from url
    const scanId = event.pathParameters?.scanId;

    if (!scanId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "scanId is required" }),
        };
    }

    const body = JSON.parse(event.body ?? "{}");
    const { gender } = body;

    const result = await updateScanGender(scanId, userId, gender);

    if (!result.success) {
        return {
            statusCode: result.code,
            body: result.body
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ scanId, status: RevealStatus.Revealed, gender: gender.toLowerCase() }),
    };
};
