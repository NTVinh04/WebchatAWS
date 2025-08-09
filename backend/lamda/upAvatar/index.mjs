import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: "ap-southeast-1" });

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { fileType } = body;

    if (!fileType) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ message: "Thiếu fileType" }),
      };
    }

    const fileExtension = fileType.split("/")[1];
    const fileName = `avatars/${uuidv4()}.${fileExtension}`;
    const bucketName = "chatapp-pic";

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        uploadUrl: signedUrl,
        imageUrl: `https://${bucketName}.s3.amazonaws.com/${fileName}`,
      }),
    };
  } catch (error) {
    console.error("Upload avatar error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Lỗi máy chủ" }),
    };
  }
};
