import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import middy from '@middy/core';
import { sendResponse } from '../responses/sendResponse.mjs';
import { errorHandler } from '../middlewares/errorHandler.mjs';

const dynamo = new AWS.DynamoDB();

async function deletePost(event) {
	const postId = event.pathParameters?.postId;
	if (!postId) throw { statusCode: 400, message: 'Missing postId' };

	const authHeader = event.headers?.authorization;
	if (!authHeader) throw { statusCode: 401, message: 'No token provided' };

	const token = authHeader.split(' ')[1];
	let decoded;
	try {
		decoded = jwt.verify(token, process.env.JWT_TOKEN);
	} catch {
		throw { statusCode: 403, message: 'Invalid token' };
	}

	const userId = decoded.userId;

	const skPostId = postId.startsWith('POST#') ? postId.slice(5) : postId;

	const pk = `USER#${userId}`;
	const sk = `POST#${skPostId}`;

	console.log('DEBUG deletePost pk:', pk);
	console.log('DEBUG deletePost sk:', sk);

	const getResult = await dynamo
		.getItem({
			TableName: 'cloud-db',
			Key: { pk: { S: pk }, sk: { S: sk } },
		})
		.promise();

	console.log('DEBUG getResult:', JSON.stringify(getResult, null, 2));

	if (!getResult.Item) throw { statusCode: 404, message: 'Post not found' };

	await dynamo
		.deleteItem({
			TableName: 'cloud-db',
			Key: { pk: { S: pk }, sk: { S: sk } },
		})
		.promise();

	console.log(`DEBUG post deleted: ${pk} / ${sk}`);

	return sendResponse(200, {}, 'Post deleted successfully');
}

export const handler = middy(deletePost).use(errorHandler());
