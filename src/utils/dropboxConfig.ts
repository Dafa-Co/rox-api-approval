import Joi from 'joi';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const redirectUri = `${process.env.DOMAIN}:${process.env.PORT}/auth-redirect`;
const dropboxAccessTokenSchema = Joi.string()
    .required()
    .messages(clientErrObj('Dropbox access token'));
const dropboxClientIdSchema = Joi.string()
    .required()
    .messages(clientErrObj('Dropbox client id'));
const dropboxClientSecretSchema = Joi.string()
    .required()
    .messages(clientErrObj('Dropbox client secret'));

let dropboxClientId : string, dropboxClientSecret : string, dropboxConfig: any, dropboxAccessToken : string

const validateCredentials = () => {
    dropboxAccessToken = Joi.attempt(process.env.DROPBOX_ACCESS_TOKEN, dropboxAccessTokenSchema);
    dropboxClientId = Joi.attempt(process.env.DROPBOX_CLIENT_ID, dropboxClientIdSchema);
    dropboxClientSecret = Joi.attempt(process.env.DROPBOX_CLIENT_SECRET, dropboxClientSecretSchema);
    dropboxConfig = {
        accessToken: dropboxAccessToken,
        clientId: dropboxClientId,
        clientSecret: dropboxClientSecret
    };
}

function clientErrObj(key: string) {
    return {
        'any.required': `${key} is required`,
    }
}

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
    dropboxAccessToken,
    dropboxClientId,
    dropboxClientSecret,
    dropboxConfig,
    ITokens,
    redirectUri,
    validateCredentials
};