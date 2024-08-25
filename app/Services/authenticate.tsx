import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import userpool from '../../userpool';

export const authenticate = (Email: string, Password: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({
      Username: Email,
      Pool: userpool,
    });

    const authDetails = new AuthenticationDetails({
      Username: Email,
      Password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        console.log("login successful");
        resolve(result);
      },
      onFailure: (err) => {
        console.log("login failed", err);
        reject(err);
      },
      mfaSetup: (challengeName, challengeParameters) => {
        console.log("MFA setup required");
        resolve({ challengeName, challengeParameters });
      },
      totpRequired: (challengeName, challengeParameters) => {
        console.log("TOTP required");
        resolve({ challengeName, challengeParameters });
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        console.log("New password required");
        resolve({ userAttributes, requiredAttributes });
      },
      mfaRequired: (challengeName, challengeParameters) => {
        console.log("MFA required");
        resolve({ challengeName, challengeParameters });
      },
    });
  });
};

export const logout = (): void => {
  const user = userpool.getCurrentUser();
  if (user) {
    user.signOut();
  }
  window.location.href = '/';
};