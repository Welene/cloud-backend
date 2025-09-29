//POST login -- sending login info in body
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import middy from '@middy/core';
import { errorHandler } from '../middlewares/errorHandler.mjs';
import { sendResponse } from '../responses/sendResponse.mjs';

const dynamo = new AWS.DynamoDB();
const TABLE_NAME = 'cloud-db';

async function handleLogin(event) {
	const { username, password } = JSON.parse(event.body);

	if (!username || !password) {
		const error = new Error('Missing username or password');
		error.statusCode = 400;
		throw error;
	}

	const pk = `USER#${username.toLowerCase()}`;
	const sk = 'PROFILE';

	const result = await dynamo // venter på resultatet fra backenden, har med info fra login body
		.getItem({
			TableName: TABLE_NAME,
			Key: { pk: { S: pk }, sk: { S: sk } },
		})
		.promise();

	if (!result.Item) {
		const error = new Error('No user registered with this name');
		error.statusCode = 404;
		throw error;
	}

	const valid = await bcrypt.compare(password, result.Item.passwordHash.S); // comparing user password with hased password in database
	if (!valid) {
		// if they are different:
		const error = new Error('Wrong password');
		error.statusCode = 401;
		throw error;
	}

	return sendResponse(
		200,
		{ username, userId: result.Item.userId.S }, // returnerer info om bruker
		'You are logged in!'
	);
}

export const handler = middy(handleLogin).use(errorHandler());
