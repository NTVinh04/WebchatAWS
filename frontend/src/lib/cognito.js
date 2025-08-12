import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'ap-southeast-1_VhB6CgGuj', // ← từ AWS Cognito
  ClientId: '6u6msr2ct88sh9h24vdainim75', // ← từ App client
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