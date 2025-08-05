import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

// Khởi tạo client AWS
const s3 = new S3Client({ region: "ap-southeast-1" });
const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { text, image, receiverId } = body;
    const senderId = event.requestContext.authorizer.claims.sub;

    console.log("Sending message with:", { senderId, receiverId });

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

    const ddbCommand = new PutItemCommand({
      TableName: "Messages",
      Item: {
        conversationId: { S: createConversationId(senderId, receiverId) },
        timestamp: { S: timestamp },
        senderId: { S: senderId },
        receiverId: { S: receiverId },
        text: { S: text || "" },
        attachment: imageUrl ? { S: imageUrl } : { NULL: true },
        createdAt: { S: createdAt }
      },
    });

    await ddb.send(ddbCommand);

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({
        conversationId: createConversationId(senderId, receiverId),
        senderId,
        receiverId,
        text: text || "",
        attachment: imageUrl,
        type: imageUrl ? "image" : "text",
        timestamp,
        createdAt,
      }),
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

function createConversationId(senderId, receiverId) {
  return [senderId, receiverId].sort().join("_");
}
