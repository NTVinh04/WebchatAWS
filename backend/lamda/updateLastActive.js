import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
};

export const handler = async (event) => {
  console.log("=== Incoming Event ===");
  console.log(JSON.stringify(event, null, 2));

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // Lấy userId từ Cognito token (nếu có)
  const userId =
    event?.requestContext?.authorizer?.claims?.sub ?? null;

  if (!userId) {
    console.warn("Missing userId in request");
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Missing userId" }),
    };
  }

  console.log("Updating status for userId:", userId);

  const command = new UpdateItemCommand({
    TableName: "User",
    Key: {
      userId: { S: userId },
    },
    UpdateExpression: "SET lastActiveAt = :now",
    ExpressionAttributeValues: {
      ":now": { N: `${Date.now()}` },
    },
  });  

  try {
    await ddb.send(command);
    console.log("User status updated successfully");

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Status updated" }),
    };
  } catch (err) {
    console.error("Error updating DynamoDB:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
