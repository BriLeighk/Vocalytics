import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID as string,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID as string,
};

// Log the pool data to verify the environment variables
console.log('UserPoolId:', poolData.UserPoolId);
console.log('ClientId:', poolData.ClientId);

export default new CognitoUserPool(poolData);