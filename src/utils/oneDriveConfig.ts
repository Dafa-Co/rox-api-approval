import { CREDENTIALS_PATH } from "./constants";
import Joi from 'joi';

const fs = require('fs');
const clientIdSchema = Joi.string()
    .required()
    .min(36)
    .max(36)
    .regex(/^(?!\d+$).*/)
    .messages(clientErrObj('Client id', 36));
const clientSecretSchema = Joi.string()
    .required()
    .min(40)
    .max(40)
    .regex(/^(?!\d+$).*/)
    .messages(clientErrObj('Client secret', 40));
const redirectUriSchema = Joi.string()
    .uri()
    .required()
    .messages(uriErrObj('redirect uri'));
const tokenUriSchema = Joi.string()
    .uri()
    .required()
    .messages(uriErrObj('token url'));
const scopeSchema = Joi.string()
    .required()
    .messages({
      'any.required': `The scope is required.`
    });
const authoritySchema = Joi.string()
    .uri()
    .required()
    .messages(uriErrObj('authority'));
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const clientId = Joi.attempt(credentials.onedrive.client_id, clientIdSchema);
const clientSecret = Joi.attempt(credentials.onedrive.client_secret, clientSecretSchema);
const redirectUri = Joi.attempt(credentials.onedrive.redirect_uri, redirectUriSchema) ;
const tokenUrl = Joi.attempt(credentials.onedrive.token_url, tokenUriSchema) ;
const scope = Joi.attempt(credentials.onedrive.scope, scopeSchema);
const authority = Joi.attempt(credentials.onedrive.authority, authoritySchema)

function uriErrObj(key: string) {
  return {
    'string.uri': `The ${key} must be a valid URL.`,
    'any.required': `The ${key} is required.`,
  }
}

function clientErrObj(key: string, minMaxNumber: number) {
  return {
    'any.required': `${key} is required`,
    'string.min': `${key} must be at least ${minMaxNumber} characters long`,
    'string.pattern.base': `${key} format is invalid`,
  }
}

export {
  clientId,
  clientSecret,
  redirectUri,
  tokenUrl,
  scope,
  authority
};