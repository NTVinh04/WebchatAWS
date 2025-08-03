import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const conversationId = event.pathParameters.conversationId;

    const command = new QueryCommand({
      TableName: "Messages",
      KeyConditionExpression: "conversationId = :cid",
      ExpressionAttributeValues: {
        ":cid": { S: conversationId },
      },
      ScanIndexForward: true,
    });

    const result = await ddb.send(command);

    const messages = result.Items.map((item) => ({
      conversationId: item.conversationId.S,
      timestamp: item.timestamp.S,
      senderId: item.senderId.S,
      receiverId: item.receiverId.S,
      text: item.text.S,
      image: item.image?.S || null,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(messages),
    };
  } catch (error) {
    console.error("Error getting messages:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
