// wsConnect.js  (CommonJS)
const https = require("https");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

const USERS_TABLE = process.env.USERS_TABLE || "User";
const REGION = process.env.AWS_REGION || "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_Bkf9j9RkN"; // gán trực tiếp

let pemsCache = null;

async function fetchPems() {
  if (pemsCache) return pemsCache;
  const url = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
  const body = await new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", reject);
  });
  const jwks = JSON.parse(body);
  const pems = {};
  jwks.keys.forEach((k) => {
    pems[k.kid] = jwkToPem(k);
  });
  pemsCache = pems;
  return pems;
}

exports.handler = async (event) => {
  console.log("=== $connect EVENT ===", JSON.stringify(event, null, 2));
  const connectionId = event.requestContext?.connectionId;
  const token = event.queryStringParameters?.token;

  if (!token) {
    console.warn("No token supplied in query string");
    return { statusCode: 401, body: "Unauthorized: missing token" };
  }

  try {
    const pems = await fetchPems();
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader) throw new Error("Invalid token");
    const pem = pems[decodedHeader.header.kid];
    if (!pem) throw new Error("Unknown token kid");
    const payload = jwt.verify(token, pem, {
      issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
    });

    const userId = payload.sub;
    if (!userId) throw new Error("Token payload missing sub");

    await dynamo.update({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: "SET connectionId = :cid, #st = :online, lastActiveAt = :now",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: {
        ":cid": connectionId,
        ":online": "online",
        ":now": new Date().toISOString()
      }
    }).promise();

    console.log(`Connected: userId=${userId} connectionId=${connectionId}`);
    return { statusCode: 200, body: "Connected" };
  } catch (err) {
    console.error("Connect error:", err);
    return { statusCode: 401, body: "Unauthorized" };
  }
};
