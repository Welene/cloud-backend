//POST login -- sending login info in body
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import middy from '@middy/core';
import { errorHandler } from '../middlewares/errorHandler.mjs';
import { sendResponse } from '../responses/sendResponse.mjs';
import jwt from 'jsonwebtoken';

const dynamo = new AWS.DynamoDB();
const JWT_TOKEN = process.env.JWT_TOKEN;

if (!JWT_TOKEN) {
	throw new Error('JWT_TOKEN environment variable is missing');
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
			TableName: 'cloud-db',
			Key: { pk: { S: pk }, sk: { S: sk } },
		})
		.promise();

	if (!result.Item) {
		const error = new Error('No user registered with this name');
		error.statusCode = 404;
		throw error;
	}

	const validPassword = await bcrypt.compare(
		password,
		result.Item.passwordHash.S
	);
	if (!validPassword) {
		const error = new Error('Wrong username/password'); // psst... don't tell the user exactly which one, hackers will benefit from that
		error.statusCode = 401;
		throw error;
	}

	const token = jwt.sign(
		{
			userId: result.Item.userId.S,
			username: result.Item.username.S,
		},
		JWT_TOKEN,
		{ expiresIn: '2h' }
	);

	return sendResponse(
		200,
		{
			token,
			username: result.Item.username.S,
			userId: result.Item.userId.S,
		},
		'You are logged in!'
	);
}

export const handler = middy(handleLogin).use(errorHandler());
