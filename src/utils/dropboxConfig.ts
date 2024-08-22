import Joi from 'joi';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const redirectUri = `http://localhost:3000/auth-redirect`;
const dropboxClientIdSchema = Joi.string()
    .required()
    .messages(clientErrObj('Dropbox client id'));
const dropboxClientSecretSchema = Joi.string()
    .required()
    .messages(clientErrObj('Dropbox client secret'));

const dropboxClientId = Joi.attempt(process.env.DROPBOX_CLIENT_ID, dropboxClientIdSchema);
const dropboxClientSecret = Joi.attempt(process.env.DROPBOX_CLIENT_SECRET, dropboxClientSecretSchema);

function clientErrObj(key: string) {
    return {
        'any.required': `${key} is required`,
    }
}

const dropboxConfig = {
  clientId: dropboxClientId,
  clientSecret: dropboxClientSecret,
};

interface ITokens {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string,
    uid: string,
    account_id: string
}

export {
  dropboxClientId,
  dropboxClientSecret,
  dropboxConfig,
  ITokens,
  redirectUri
};