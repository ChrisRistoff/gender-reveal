import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getAllScansWithUrls } from "./getScansService";


export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const scansWithUrls = await getAllScansWithUrls();

    return {
        statusCode: 200,
        body: JSON.stringify(scansWithUrls),
    };
};
