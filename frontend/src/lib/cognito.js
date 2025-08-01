import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'ap-southeast-1_Bkf9j9RkN', // ← từ AWS Cognito
  ClientId: '3sngabanesabv228v3vlb98dr9', // ← từ App client
};

export const userPool = new CognitoUserPool(poolData);
export function loginCognito(email, password) {
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  const user = new CognitoUser({
    Username: email,
    Pool: userPool,
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        resolve(result);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}