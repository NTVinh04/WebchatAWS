Link Test:

(S3)  http://chatapp-web.s3-website-ap-southeast-1.amazonaws.com/

(CloudFront)  d1comvci1i8tqc.cloudfront.net

Đổi url cho các file sau

websocket: n5rwnf1sm9.execute-api.ap-southeast-1.amazonaws.com

RestAPI: 92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com

userpoolId: ap-southeast-1_VhB6CgGuj

clientId: 6u6msr2ct88sh9h24vdainim75

Table: 
       User,
       Messages
       
S3 bucket: 
           chatapp-pic,
           chatapp-web

corsS3.json: 
            "AllowedOrigins": ["http://chatapp-web.s3-website-ap-southeast-1.amazonaws.com"],

upAvatar/index.mjs: 
                const fileName = `avatars/${uuidv4()}.${fileExtension}`;
                const bucketName = "chatapp-pic";

createUser.mjs:
            profilePic: "      profilePic: "https://chatapp-pic.s3.ap-southeast-1.amazonaws.com/avatar.png",

getMessage.mjs:
            TableName: "Messages",

sendMessages.mjs
            endpoint: 'https://n5rwnf1sm9.execute-api.ap-southeast-1.amazonaws.com/production' //url websocket nhưng phải để là https nếu không sẽ không nhận tin nhắn realtime được

            Bucket: "chatapp-pic",
            Key: `messages/${fileName}`,

connect/index.js
            const USERS_TABLE = process.env.USERS_TABLE || "User";
            const REGION = process.env.AWS_REGION || "ap-southeast-1";
            const USER_POOL_ID = "ap-southeast-1_VhB6CgGuj"; // gán trực tiếp

axios.js
            baseURL: "https://92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com/dev",

socket.js
            const socket = new WebSocket("wss://n5rwnf1sm9.execute-api.ap-southeast-1.amazonaws.com/production/");

ProfilePage.jsx
            const res = await fetch('https://92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com/dev/me/avatar', {
            await fetch("https://92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com/dev/me", {

useAuthStore.js
            const wsUrl = `wss://n5rwnf1sm9.execute-api.ap-southeast-1.amazonaws.com/production?token=${encodeURIComponent(idToken)`;
            
            const res = await fetch(
                "https://92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com/dev/user",
            {
            
            "https://92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com/dev/active",

            "https://92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com/dev/me",
    
            "https://92ll2qcxai.execute-api.ap-southeast-1.amazonaws.com/dev/me",

avatars3.js:

            export const avatarS3 = "https://chatapp-pic.s3.ap-southeast-1.amazonaws.com/avatar.png";
