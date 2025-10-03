// POST -- sends username, password to database...
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import middy from '@middy/core';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from '../middlewares/errorHandler.mjs';
import { sendResponse } from '../responses/sendResponse.mjs';

const dynamo = new AWS.DynamoDB();

// Function
async function handleRegister(event) {
	const { username, password } = JSON.parse(event.body);
	// fetches whatever the frontend body has in it

	const pk = `USER#${username.toLowerCase()}`;
	const sk = 'PROFILE';

	if (!username || !password) {
		// if one of them is missing...
		const error = new Error('Missing username or password');
		error.statusCode = 400;
		throw error;
	}

	if (password.length < 6 || password.length > 30) {
		const error = new Error('Password length: between 6 and 30 characters');
		error.statusCode = 400;
		throw error;
	}

	// checking if the user already exists
	const existing = await dynamo
		.getItem({
			TableName: 'cloud-db',
			Key: {
				pk: { S: pk },
				sk: { S: sk },
			},
		})
		.promise();

	if (existing.Item) {
		const error = new Error('Username already taken');
		error.statusCode = 409;
		throw error;
	}

	// hashing passsword and storiing it in a variable -- mixing it 10 times
	const hashedPassword = await bcrypt.hash(password, 10);

	const fullId = uuidv4(); // don't want a very long uuid id, so I'm splicing it to 4
	const userId = fullId.slice(0, 4);

	const now = new Date();
	const createdAt = `${now.getFullYear()}-${String(
		now.getMonth() + 1
	).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(
		now.getHours()
	).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

	// saving the new user to the database inside my table, as a new USER item
	await dynamo
		.putItem({
			TableName: 'cloud-db',
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

	// if it works
	return sendResponse(
		201,
		{ userId, username },
		`User ${username} is now registered`
	);
}

export const handler = middy(handleRegister).use(errorHandler());
