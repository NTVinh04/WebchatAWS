import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const s3 = new S3Client({ region: "ap-southeast-1" });
const ddb = new DynamoDBClient({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { text, image, receiverId } = body;
    const senderId = event.requestContext.authorizer.claims.sub;

    let imageUrl = null;

    // Nếu có ảnh:
    if (image) {
      if (image.startsWith("http")) {
        // Trường hợp ảnh là URL đã upload sẵn
        imageUrl = image;
      } else {
        // Trường hợp ảnh là base64 → upload lên S3
        const buffer = Buffer.from(image, "base64");
        const fileName = `${Date.now()}.jpg`;

        const s3Command = new PutObjectCommand({
          Bucket: "chatapp-pic",
          Key: `messages/${fileName}`,
          Body: buffer,
          ContentEncoding: "base64",
          ContentType: "image/jpeg",
          ACL: "public-read",
        });

        await s3.send(s3Command);
        imageUrl = `https://chatapp-pic.s3.ap-southeast-1.amazonaws.com/messages/${fileName}`;
      }
    }

    const timestamp = Date.now().toString();

    const ddbCommand = new PutItemCommand({
      TableName: "Messages",
      Item: {
        conversationId: { S: createConversationId(senderId, receiverId) },
        timestamp: { S: timestamp },
        senderId: { S: senderId },
        receiverId: { S: receiverId },
        text: { S: text || "" },
        image: imageUrl ? { S: imageUrl } : { NULL: true },
      },
    });

    await ddb.send(ddbCommand);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Message sent",
        imageUrl,
      }),
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", detail: error.message }),
    };
  }
};

function createConversationId(senderId, receiverId) {
  return [senderId, receiverId].sort().join("_");
}
