// POST -- sends username, password to database...
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import middy from '@middy/core';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from '../middlewares/errorHandler.mjs';
import { sendResponse } from '../responses/sendResponse.mjs';

const dynamo = new AWS.DynamoDB();
const TABLE_NAME = 'cloud-db'; // a dynamo client --> with my dynamo table name

// Function
async function handleRegister(event) {
	const { username, password } = JSON.parse(event.body);
	// fetches whatever the frontend body has in it

	if (!username || !password) {
		// if one of them is missing...
		const error = new Error('Missing username or password');
		error.statusCode = 400;
		throw error;
	}

	// hashing passsword and storiing it in a variable -- mixing it 10 times
	const hashedPassword = await bcrypt.hash(password, 10);

	const userId = uuidv4();
	const pk = `USER#${userId}`;
	const sk = 'PROFILE';

	// checking if the user already exists
	const existing = await dynamo
		.getItem({
			TableName: TABLE_NAME,
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

	// saving the new user to the database inside my table, as a new USER item
	await dynamo
		.putItem({
			TableName: TABLE_NAME,
			Item: {
				pk: { S: `USER#${userId}` },
				sk: { S: 'PROFILE' },
				userId: { S: userId },
				username: { S: username },
				passwordHash: { S: hashedPassword },
				createdAt: { S: new Date().toISOString() },
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
