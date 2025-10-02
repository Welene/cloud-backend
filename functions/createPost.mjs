// POST -- create a new post for the logged-in user
import AWS from 'aws-sdk';
import middy from '@middy/core';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const dynamo = new AWS.DynamoDB();
const JWT_TOKEN = process.env.JWT_TOKEN;

if (!JWT_TOKEN) throw new Error('JWT_TOKEN missing');

async function createNewPost(event) {
	const authHeader =
		event.headers.Authorization || event.headers.authorization;
	if (!authHeader) {
		return {
			statusCode: 401,
			body: JSON.stringify({ message: 'No token provided' }),
		};
	}

	const token = authHeader.split(' ')[1];

	let payload;
	try {
		payload = jwt.verify(token, JWT_TOKEN);
	} catch (err) {
		return {
			statusCode: 401,
			body: JSON.stringify({ message: 'Invalid token' }),
		};
	}

	const { userId } = payload;
	const { title, content } = JSON.parse(event.body);

	if (!title || !content) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: 'Title and content required' }),
		};
	}

	const profileResult = await dynamo //---------------------------------------------------------------------------------GETTING THE USERNAME FROM SK: PROFILE
		.getItem({
			TableName: 'cloud-db',
			Key: {
				pk: { S: `USER#${userId}` },
				sk: { S: 'PROFILE' },
			},
			ProjectionExpression: 'username',
		})
		.promise();

	const username = profileResult.Item?.username?.S || 'Unknown';

	// ------------------------------------------------------------------------------------------------------------------------------------------------------------

	const fullId = uuidv4();
	const postId = `POST#${fullId.slice(0, 4)}`; // short 4-character id for each post

	const now = new Date();
	const createdAt = `${now.getFullYear()}-${String(
		now.getMonth() + 1
	).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(
		now.getHours()
	).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

	await dynamo
		.putItem({
			TableName: 'cloud-db',
			Item: {
				pk: { S: `USER#${userId}` },
				sk: { S: postId },
				username: { S: username }, //--------------------------------------------------------------------------------------ADDED USERNAME HERE
				title: { S: title },
				content: { S: content },
				createdAt: { S: createdAt },
				GSI1PK: { S: 'POST' }, // ................................................................................ NEW GSI STUFF ADDED THURSDAY
				GSI1SK: { S: new Date().toISOString() }, // ............................................................... NEW GSI STUFF ADDED THURSDAY
			},
		})
		.promise();

	return {
		statusCode: 201,
		body: JSON.stringify({ message: 'Post created', postId, username }), //----------------------------------------------------------ADDED USERNAME HERE TOO
	};
}

export const handler = middy(createNewPost);
