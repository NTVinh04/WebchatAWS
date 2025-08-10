import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const tableName = "User";

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Hoặc domain cụ thể nếu cần
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };

  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Preflight OK" }),
      };
    }

    console.log("Received event:", JSON.stringify(event, null, 2));

    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!userId) {
      console.error("Không tìm thấy userId từ authorizer.");
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      console.error("Lỗi parse body:", err);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Body không hợp lệ." }),
      };
    }

    const allowedFields = ["profilePic", "fullName", "status"];
    const updateFields = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined && body[key] !== null) {
        updateFields[key] = body[key];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Không có trường nào hợp lệ để cập nhật." }),
      };
    }

    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const key in updateFields) {
      const placeholder = key === "status" ? "#status" : `#${key}`;
      updateExpressions.push(`${placeholder} = :${key}`);
      expressionAttributeValues[`:${key}`] = updateFields[key];
      expressionAttributeNames[placeholder] = key;
    }

    const updateExpression = `SET ${updateExpressions.join(", ")}`;

    console.log("UpdateCommand Input:", {
      TableName: tableName,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
    });

    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Cập nhật thành công." }),
    };

  } catch (error) {
    console.error("Lỗi xử lý PUT /me:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Lỗi máy chủ", error: error.message }),
    };
  }
};
