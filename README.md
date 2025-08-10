Đổi url cho các file sau

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
            endpoint: "https://hiuze9jnyb.execute-api.ap-southeast-1.amazonaws.com/production" // WebSocket endpoint

            Bucket: "chatapp-pic",
            Key: `messages/${fileName}`,

connect/index.js
            const USERS_TABLE = process.env.USERS_TABLE || "User";
            const REGION = process.env.AWS_REGION || "ap-southeast-1";
            const USER_POOL_ID = "ap-southeast-1_Bkf9j9RkN"; // gán trực tiếp

axios.js
            baseURL: "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev",

socket.js
            const socket = new WebSocket("wss://f3dufx8egk.execute-api.ap-southeast-1.amazonaws.com/production/");

ProfilePage.jsx
            const res = await fetch('https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me/avatar', {
            await fetch("https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me", {

useAuthStore.js
            const wsUrl = `wss://hiuze9jnyb.execute-api.ap-southeast-1.amazonaws.com/production?token=${encodeURIComponent(idToken)`;
            
            const res = await fetch(
                "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/user",
            {
            
            "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/active",

            "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me",
    
            "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me",

avatars3.js:

            export const avatarS3 = "https://chatapp-pic.s3.ap-southeast-1.amazonaws.com/avatar.png";
