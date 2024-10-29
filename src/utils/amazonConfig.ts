import Joi from 'joi';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const bucketNameSchema = Joi.string()
    .required()
    .messages(clientErrObj('Bucket name'));
const accessKeySchema = Joi.string()
    .required()
    .messages(clientErrObj('Bucket key'));
const secretKeySchema = Joi.string()
    .required()
    .messages(clientErrObj('Bucket secret'));
const regionSchema = Joi.string()
    .required()
    .messages(clientErrObj('Region'));
const endpointSchema = Joi.string()
    .required()
    .messages(clientErrObj('Endpoint'));

let bucketName: string, accessKey: string, secretKey: string, region:string, endpoint: string

const validateCredentials = () => {
    bucketName = Joi.attempt(process.env.BUCKETNAME, bucketNameSchema);
    accessKey = Joi.attempt(process.env.BUCKETKEY, accessKeySchema);
    secretKey = Joi.attempt(process.env.BUCKETSECRET, secretKeySchema) ;
    region = Joi.attempt(process.env.BUCKETREGION, regionSchema) ;
    endpoint = Joi.attempt(process.env.AWS_ENDPOINT, endpointSchema);
}

function clientErrObj(key: string) {
    return {
        'any.required': `${key} is required`,
    }
}

export {
  bucketName,
  accessKey,
  secretKey,
  region,
  endpoint,
  validateCredentials
};