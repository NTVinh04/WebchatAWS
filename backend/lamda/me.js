import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  console.log("requestContext:", JSON.stringify(event.requestContext, null, 2)); // log để debug

  try {
    const claims = event?.requestContext?.authorizer?.claims;
    if (!claims?.sub) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized: Missing claims.sub" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        }
      };
    }

    const userId = claims.sub;

    const command = new GetItemCommand({
      TableName: "User",
      Key: {
        userId: { S: userId }
      }
    });

    const result = await ddb.send(command);
    console.log("DynamoDB result:", JSON.stringify(result));

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        }
      };
    }

    const user = unmarshall(result.Item);

    return {
      statusCode: 200,
      body: JSON.stringify(user),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    };
  } catch (err) {
    console.error("Error in /me handler:", err); // Log ra CloudWatch
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal server error" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    };
  }
};
