import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        }
      };
    }

    const { fullName, avatar } = JSON.parse(event.body);

if (!fullName || typeof fullName !== "string") {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Missing or invalid 'fullName'" }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    }
  };
}


    const claims = event?.requestContext?.authorizer?.claims;
    if (!claims?.sub || !claims?.email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized: missing claims" }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        }
      };
    }

    const newUser = {
      userId: claims.sub,
      email: claims.email,
      fullName,
      createdAt: new Date().toISOString(),
      profilePic: "https://chatapp-pic.s3.ap-southeast-1.amazonaws.com/avatar.png",
    };

    const command = new PutItemCommand({
      TableName: "User",
      Item: marshall(newUser)
    });

    await ddb.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User created", user: newUser }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    };
  } catch (err) {
    console.error("PutItem error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      }
    };
  }
};
