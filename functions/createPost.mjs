// POST -- create a new post for the logged-in user
import AWS from 'aws-sdk';
import middy from '@middy/core';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from '../middlewares/errorHandler.mjs';

const dynamo = new AWS.DynamoDB();
const TABLE_NAME = 'cloud-db';
const JWT_TOKEN = process.env.JWT_TOKEN;

if (!JWT_TOKEN) throw new Error('JWT_TOKEN missing');

async function createNewPost(event) {
	const authHeader =
		event.headers.Authorization || event.headers.authorization;
	if (!authHeader) {
		const error = new Error('No token provided');
		error.statusCode = 401;
		throw error;
	}

	const token = authHeader.split(' ')[1];

	let payload;
	try {
		payload = jwt.verify(token, JWT_TOKEN);
	} catch (err) {
		const error = new Error('Invalid token');
		error.statusCode = 401;
		throw error;
	}

	const { userId } = payload;
	const { title, content } = JSON.parse(event.body);

	if (!title || !content) {
		const error = new Error('Title and content required');
		error.statusCode = 400;
		throw error;
	}

	const fullId = uuidv4();
	const postId = `POST#${fullId.slice(0, 4)}`;

	await dynamo
		.putItem({
			TableName: TABLE_NAME,
			Item: {
				pk: { S: `USER#${userId}` },
				sk: { S: postId },
				title: { S: title },
				content: { S: content },
				createdAt: { S: new Date().toISOString() },
			},
		})
		.promise();

	return {
		statusCode: 201,
		body: { message: 'Post created', postId },
	};
}

export const handler = middy(createNewPost).use(errorHandler());
