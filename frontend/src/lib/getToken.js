// getToken.js
import { CognitoUserPool } from "amazon-cognito-identity-js";

// Dùng lại cấu hình như trong cognito.js
const poolData = {
  UserPoolId: "ap-southeast-1_VhB6CgGuj",
  ClientId: "6u6msr2ct88sh9h24vdainim75",
};

const userPool = new CognitoUserPool(poolData);

// Hàm dùng để lấy ID Token hiện tại
export function getCurrentIdToken() {
  const currentUser = userPool.getCurrentUser();

  if (!currentUser) {
    console.warn(" Không có user nào đang đăng nhập");
    return null;
  }

  return new Promise((resolve, reject) => {
    currentUser.getSession((err, session) => {
      if (err || !session.isValid()) {
        console.error("Session không hợp lệ:", err);
        reject("Invalid session");
      } else {
        const token = session.getIdToken().getJwtToken();
        resolve(token);
      }
    });
  });
}
