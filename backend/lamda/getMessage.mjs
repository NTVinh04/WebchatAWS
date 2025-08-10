import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const conversationId = event.pathParameters?.conversationId;

    if (!conversationId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ error: "Missing conversationId" }),
      };
    }

    const command = new QueryCommand({
      TableName: "Messages",
      KeyConditionExpression: "conversationId = :cid",
      ExpressionAttributeValues: {
        ":cid": { S: conversationId },
      },
      ScanIndexForward: true,
    });

    const result = await ddb.send(command);

    const messages = result.Items.map((item) => {
      const data = unmarshall(item);
      return {
        ...data,
        image: data.attachment || null,
        type: data.attachment ? "image" : "text",
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(messages),
    };
  } catch (error) {
    console.error("Error getting messages:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
