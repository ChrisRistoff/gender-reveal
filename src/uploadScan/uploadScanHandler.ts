import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ensureNoScanLastYear, uploadScanImage } from "./uploadScanService";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // get user id from the cognito token
    const userId = event.requestContext.authorizer?.claims?.sub;

    if (!userId) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "unauthorized" }),
        };
    }

    const existingScanResult = await ensureNoScanLastYear(userId);

    if (!existingScanResult.success) {
        return {
            statusCode: existingScanResult.code,
            body: existingScanResult.body,
        };
    }

    const { scanId, presignedUrl } = await uploadScanImage(userId);

    // return the url and scanId to the frontend
    // frontend uploads the image directly to s3
    // stores the scanId to reference this scan later
    return {
        statusCode: 201,
        body: JSON.stringify({ scanId, presignedUrl }),
    };
};
