import Joi from 'joi';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const azureAccountNameSchema = Joi.string()
    .required()
    .messages(clientErrObj('Azure Account Name'));
const azureAccountKeySchema = Joi.string()
    .required()
    .messages(clientErrObj('Azure Account Key'));
const azureEndpointSchema = Joi.string()
    .required()
    .messages(clientErrObj('Azure Endpoint'));
const azureContainerNameSchema = Joi.string()
    .required()
    .messages(clientErrObj('Azure Container Name'));

let azureAccountName: string, azureAccountKey: string, azureEndpoint: string, azureContainerName: string

const validateCredentials = () => {
    azureAccountName = Joi.attempt(process.env.AZURE_STORAGE_ACCOUNT_NAME, azureAccountNameSchema);
    azureAccountKey = Joi.attempt(process.env.AZURE_STORAGE_ACCOUNT_KEY, azureAccountKeySchema);
    azureEndpoint = Joi.attempt(process.env.AZURE_ENDPOINT, azureEndpointSchema);
    azureContainerName = Joi.attempt(process.env.AZURE_CONTAINER_NAME, azureContainerNameSchema);
}

function clientErrObj(key: string) {
    return {
        'any.required': `${key} is required`,
    }
}

export {
  azureAccountName,
  azureAccountKey,
  azureEndpoint,
  azureContainerName,
  validateCredentials
};