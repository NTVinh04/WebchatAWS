import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

// Khởi tạo client AWS
const s3 = new S3Client({ region: "ap-southeast-1" });
const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

//  THÊM: WebSocket API client
const apiGateway = new ApiGatewayManagementApiClient({
  region: "ap-southeast-1",
  endpoint: "https://hiuze9jnyb.execute-api.ap-southeast-1.amazonaws.com/production" // WebSocket endpoint của bạn
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
        // Tự động phát hiện định dạng ảnh
        let contentType = "image/jpeg";
        let extension = "jpg";

        if (image.startsWith("data:image/png")) {
          contentType = "image/png";
          extension = "png";
        } else if (image.startsWith("data:image/jpeg")) {
          contentType = "image/jpeg";
          extension = "jpg";
        }

        // Loại bỏ prefix data:image/...;base64, nếu có
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

    // 2.  THÊM: Broadcast qua WebSocket
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

    console.log(" Broadcasting message via WebSocket:", messageData);
    
    try {
      await broadcastToConversation(finalConversationId, {
        type: "message",
        payload: messageData
      });
      console.log(" WebSocket broadcast successful");
    } catch (wsError) {
      console.error(" WebSocket broadcast failed:", wsError);
      // Không throw error để không ảnh hưởng đến việc lưu tin nhắn
    }

    // 3. Trả về response
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

//  THÊM: Function broadcast qua WebSocket
async function broadcastToConversation(conversationId, message) {
  console.log(` Broadcasting to conversation: ${conversationId}`);
  
  // Lấy danh sách user IDs từ conversation ID
  const userIds = conversationId.split('_');
  console.log(` Users in conversation: ${userIds.join(', ')}`);
  
  // Gửi tới tất cả users trong conversation
  for (const userId of userIds) {
    await sendToUser(userId, message);
  }
}

//  THÊM: Function gửi message tới một user
async function sendToUser(userId, message) {
  console.log(` Sending to user: ${userId}`);
  
  try {
    // Lấy danh sách connection IDs của user từ DynamoDB
    const connections = await getUserConnections(userId);
    console.log(` User ${userId} has ${connections.length} connections`);
    
    // Gửi tới tất cả connections của user
    for (const connectionId of connections) {
      try {
        const command = new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(message)
        });
        
        await apiGateway.send(command);
        console.log(` Sent to connection: ${connectionId}`);
        
      } catch (error) {
        console.error(` Failed to send to connection ${connectionId}:`, error);
        
        // Nếu connection đã chết (410), xóa khỏi database
        if (error.statusCode === 410) {
          await removeConnection(userId, connectionId);
          console.log(`🗑️ Removed dead connection: ${connectionId}`);
        }
      }
    }
    
  } catch (error) {
    console.error(` Error sending to user ${userId}:`, error);
  }
}

//  THÊM: Function lấy connections của user từ DynamoDB
async function getUserConnections(userId) {
  try {
    const command = new QueryCommand({
      TableName: "User", // Tên table lưu connections
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId }
      }
    });
    
    const result = await ddb.send(command);
    
    return result.Items?.map(item => item.connectionId.S) || [];
    
  } catch (error) {
    console.error(` Error getting connections for user ${userId}:`, error);
    return [];
  }
}

//  THÊM: Function xóa connection chết
async function removeConnection(userId, connectionId) {
  try {
    const command = new DynamoDBClient.DeleteItemCommand({
      TableName: "User",
      Key: {
        userId: { S: userId },
        connectionId: { S: connectionId }
      }
    });
    
    await ddb.send(command);
    
  } catch (error) {
    console.error(` Error removing connection:`, error);
  }
}

function createConversationId(senderId, receiverId) {
  return [senderId, receiverId].sort().join("_");
}