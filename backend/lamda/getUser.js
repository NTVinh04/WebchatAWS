import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const currentUserId = event.requestContext.authorizer.claims.sub;

    const command = new ScanCommand({
      TableName: "User",
    });

    const result = await ddb.send(command);
    const allUsers = result.Items.map(item => unmarshall(item));

    const filtered = allUsers.filter(user => user._id !== currentUserId);

    return {
      statusCode: 200,
      body: JSON.stringify(filtered),
      headers: {
        "Access-Control-Allow-Origin": "*", // cho phép gọi từ FE
        "Access-Control-Allow-Headers": "*"
      }
    };
    } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    };
  }
}
