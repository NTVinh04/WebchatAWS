import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;

    await ddb.send(new DeleteItemCommand({
      TableName: "WebSocketConnections",
      Key: { connectionId: { S: connectionId } },
    }));

    return { statusCode: 200, body: "Disconnected." };
  } catch (err) {
    console.error("Disconnect error:", err);
    return { statusCode: 500, body: "Error" };
  }
};