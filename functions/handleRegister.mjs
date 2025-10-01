// POST -- sends username, password to database...
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import middy from '@middy/core';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from '../middlewares/errorHandler.mjs';
import { sendResponse } from '../responses/sendResponse.mjs';

const dynamo = new AWS.DynamoDB();
const TABLE_NAME = 'cloud-db';

async function handleRegister(event) {
	const { username, password } = JSON.parse(event.body);

	if (!username || !password) {
		const error = new Error('Missing username or password');
		error.statusCode = 400;
		throw error;
	}

	const pk = `USER#${username.toLowerCase()}`;
	const sk = 'PROFILE';

	const existing = await dynamo
		.getItem({
			TableName: TABLE_NAME,
			Key: { pk: { S: pk }, sk: { S: sk } },
		})
		.promise();

	if (existing.Item) {
		const error = new Error('Username already taken');
		error.statusCode = 409;
		throw error;
	}

	const hashedPassword = await bcrypt.hash(password, 10);

	const userId = uuidv4().slice(0, 4);
	const now = new Date();
	const createdAt = `${now.getFullYear()}-${String(
		now.getMonth() + 1
	).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(
		now.getHours()
	).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

	await dynamo
		.putItem({
			TableName: TABLE_NAME,
			Item: {
				pk: { S: pk },
				sk: { S: sk },
				userId: { S: userId },
				username: { S: username },
				passwordHash: { S: hashedPassword },
				createdAt: { S: createdAt },
			},
		})
		.promise();

	return sendResponse(
		201,
		{ userId, username },
		`User ${username} is now registered`
	);
}

export const handler = middy(handleRegister).use(errorHandler());
