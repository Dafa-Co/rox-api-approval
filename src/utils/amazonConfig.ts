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

const bucketName = Joi.attempt(process.env.BUCKETNAME, bucketNameSchema);
const accessKey = Joi.attempt(process.env.BUCKETKEY, accessKeySchema);
const secretKey = Joi.attempt(process.env.BUCKETSECRET, secretKeySchema) ;
const region = Joi.attempt(process.env.BUCKETREGION, regionSchema) ;
const endpoint = Joi.attempt(process.env.AWS_ENDPOINT, endpointSchema);

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
  endpoint
};