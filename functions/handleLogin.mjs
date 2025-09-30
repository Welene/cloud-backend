//POST login -- sending login info in body
//POST login -- sending login info in body
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import middy from '@middy/core';
import { errorHandler } from '../middlewares/errorHandler.mjs';
import { sendResponse } from '../responses/sendResponse.mjs';
import jwt from 'jsonwebtoken';

const dynamo = new AWS.DynamoDB();
const TABLE_NAME = 'cloud-db';
const JWT_TOKEN = process.env.JWT_TOKEN;

// ✅ check that the JWT secret exists before using it
if (!JWT_TOKEN) {
	throw new Error('JWT_TOKEN environment variable is missing'); // updated error message
}

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

	// ✅ signing JWT remains the same
	const token = jwt.sign(
		{
			userId: result.Item.userId.S,
			username: result.Item.username.S,
		},
		JWT_TOKEN,
		{ expiresIn: '1h' }
	);

	return sendResponse(
		200,
		{
			token, // JWT (token) gets sent to the frontend as a response, can used in other functions
			username: result.Item.username.S,
			userId: result.Item.userId.S,
		},
		'You are logged in!'
	);
}

// ✅ export wrapped in Middy with error handler remains the same
export const handler = middy(handleLogin).use(errorHandler());
