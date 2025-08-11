// Lambda gửi tin nhắn - Fixed cho single key schema
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

// Khởi tạo client AWS
const s3 = new S3Client({ region: "ap-southeast-1" });
const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

const apiGateway = new ApiGatewayManagementApiClient({
  region: "ap-southeast-1",
  endpoint: 'https://5gm2fis56a.execute-api.ap-southeast-1.amazonaws.com/production'
});

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { text, image, receiverId, conversationId } = body;
    const senderId = event.requestContext.authorizer.claims.sub;

    console.log("Sending message with:", { senderId, receiverId, conversationId });

    let imageUrl = null;

    if (image) {
      if (image.startsWith("http")) {
        imageUrl = image;
      } else {
        // Upload image logic giữ nguyên
        let contentType = "image/jpeg";
        let extension = "jpg";

        if (image.startsWith("data:image/png")) {
          contentType = "image/png";
          extension = "png";
        } else if (image.startsWith("data:image/jpeg")) {
          contentType = "image/jpeg";
          extension = "jpg";
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const fileName = `${Date.now()}.${extension}`;
        const s3Command = new PutObjectCommand({
          Bucket: "chatapp-pic",
          Key: `messages/${fileName}`,
          Body: buffer,
          ContentEncoding: "base64",
          ContentType: contentType,
        });

        await s3.send(s3Command);
        imageUrl = `https://chatapp-pic.s3.ap-southeast-1.amazonaws.com/messages/${fileName}`;
      }
    }

    const timestamp = Date.now().toString();
    const createdAt = new Date().toISOString();
    const finalConversationId = conversationId || createConversationId(senderId, receiverId);

    // 1. Lưu tin nhắn vào DynamoDB
    const ddbCommand = new PutItemCommand({
      TableName: "Messages",
      Item: {
        conversationId: { S: finalConversationId },
        timestamp: { S: timestamp },
        senderId: { S: senderId },
        receiverId: { S: receiverId },
        text: { S: text || "" },
        attachment: imageUrl ? { S: imageUrl } : { NULL: true },
        createdAt: { S: createdAt }
      },
    });

    await ddb.send(ddbCommand);

    // 2.  FIXED: Gửi WebSocket tới receiver với schema mới
    const messageData = {
      conversationId: finalConversationId,
      senderId,
      receiverId,
      text: text || "",
      attachment: imageUrl,
      type: imageUrl ? "image" : "text",
      timestamp,
      createdAt,
    };

    console.log(" Sending message via WebSocket to receiver:", receiverId);
    
    try {
      //  GỬI CHỈ TỚI RECEIVER (không gửi lại cho sender)
      await sendToUser(receiverId, {
        type: "message",
        payload: messageData
      });
      console.log(` WebSocket sent to receiver: ${receiverId}`);
    } catch (wsError) {
      console.error(" WebSocket send failed:", wsError);
      // Không throw error để không ảnh hưởng đến việc lưu tin nhắn
    }

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify(messageData),
    };

  } catch (error) {
    console.error("Error sending message:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ error: "Internal server error", detail: error.message }),
    };
  }
};

//  FIXED: Gửi message tới một user (single connection per user)
async function sendToUser(userId, message) {
  console.log(` Sending to user: ${userId}`);
  
  try {
    //  LẤY connection của user từ table User
    const userConnection = await getUserConnection(userId);
    
    if (!userConnection) {
      console.log(` No connection found for user: ${userId}`);
      return;
    }

    console.log(` Found connection for user ${userId}: ${userConnection}`);
    
    try {
      const command = new PostToConnectionCommand({
        ConnectionId: userConnection,
        Data: JSON.stringify(message)
      });
      
      await apiGateway.send(command);
      console.log(` Message sent to user ${userId} via connection: ${userConnection}`);
      
    } catch (error) {
      console.error(` Failed to send to connection ${userConnection}:`, error);
      
      //  Nếu connection đã chết (410), xóa khỏi database
      if (error.statusCode === 410) {
        await removeDeadConnection(userId);
        console.log(` Removed dead connection for user: ${userId}`);
      }
    }
    
  } catch (error) {
    console.error(` Error sending to user ${userId}:`, error);
  }
}

//  FIXED: Lấy connection của user (single connection)
async function getUserConnection(userId) {
  try {
    // Sử dụng DynamoDB SDK v3
    const { DynamoDBClient, GetItemCommand } = await import("@aws-sdk/client-dynamodb");
    const dynamoClient = new DynamoDBClient({ region: "ap-southeast-1" });
    
    const command = new GetItemCommand({
      TableName: "User",
      Key: {
        userId: { S: userId }
      }
    });
    
    const result = await dynamoClient.send(command);
    
    // Trả về connectionId nếu có và user đang online
    if (result.Item && result.Item.connectionId && result.Item.status?.S === "online") {
      return result.Item.connectionId.S;
    }
    
    return null;
    
  } catch (error) {
    console.error(` Error getting connection for user ${userId}:`, error);
    return null;
  }
}

//  FIXED: Xóa connection chết
async function removeDeadConnection(userId) {
  try {
    const { DynamoDBClient, UpdateItemCommand } = await import("@aws-sdk/client-dynamodb");
    const dynamoClient = new DynamoDBClient({ region: "ap-southeast-1" });
    
    const command = new UpdateItemCommand({
      TableName: "User",
      Key: {
        userId: { S: userId }
      },
      UpdateExpression: "REMOVE connectionId SET #st = :offline",
      ExpressionAttributeNames: {
        "#st": "status"
      },
      ExpressionAttributeValues: {
        ":offline": { S: "offline" }
      }
    });
    
    await dynamoClient.send(command);
    console.log(` Cleared dead connection for user: ${userId}`);
    
  } catch (error) {
    console.error(` Error clearing dead connection for user ${userId}:`, error);
  }
}

function createConversationId(senderId, receiverId) {
  return [senderId, receiverId].sort().join("_");
}