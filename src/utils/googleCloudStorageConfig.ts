import Joi from 'joi';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const bucketNameSchema = Joi.string()
    .required()
    .messages(clientErrObj('Bucket name'));
const projectIdSchema = Joi.string()
    .required()
    .messages(clientErrObj('Project Id'));

let bucketName: string, projectId: string

const validateCredentials = () => { console.log('asasas', process.env.GOOGLEBUCKETNAME);

    bucketName = Joi.attempt(process.env.GOOGLEBUCKETNAME, bucketNameSchema);
    projectId = Joi.attempt(process.env.GOOGLEBUCKETKEY, projectIdSchema);
}

function clientErrObj(key: string) {
    return {
        'any.required': `${key} is required`,
    }
}

export {
  bucketName,
  projectId,
  validateCredentials
};