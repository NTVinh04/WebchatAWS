import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    // Log toàn bộ event để kiểm tra requestContext, authorizer, claims
    console.log("Received event:", JSON.stringify(event, null, 2));

    const currentUserId = event.requestContext.authorizer.claims.sub;
    console.log("Current user ID:", currentUserId); // Log user ID

    const command = new ScanCommand({
      TableName: "User",
    });

    const result = await ddb.send(command);
    console.log("Scan result:", JSON.stringify(result, null, 2)); // Log toàn bộ kết quả từ DynamoDB

    const allUsers = result.Items.map(item => unmarshall(item));
    console.log("Unmarshalled users:", allUsers); // Log toàn bộ user sau khi unmarshall

    const filtered = allUsers.filter(user => user.userId !== currentUserId);
    console.log("Filtered users:", filtered); // Log kết quả sau khi filter

    return {
      statusCode: 200,
      body: JSON.stringify(filtered),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    };
  } catch (err) {
    // Log lỗi nếu có
    console.error("Error in /user handler:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    };
  }
};
