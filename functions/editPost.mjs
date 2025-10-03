import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import middy from '@middy/core';
import { sendResponse } from '../responses/sendResponse.mjs';
import { errorHandler } from '../middlewares/errorHandler.mjs';

const dynamo = new AWS.DynamoDB();

async function editPost(event) {
	try {
		// Get postId from path
		const postId = event.pathParameters?.postId;
		if (!postId) return sendResponse(400, {}, 'Missing postId');

		// Get auth token
		const authHeader = event.headers?.authorization;
		if (!authHeader) return sendResponse(401, {}, 'No token provided');

		const token = authHeader.split(' ')[1];
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN);
		} catch {
			return sendResponse(403, {}, 'Invalid token');
		}
		const userId = decoded.userId;

		// Parse body safely
		let body = event.body;
		if (!body) return sendResponse(400, {}, 'Missing request body');
		if (typeof body === 'string') {
			try {
				body = JSON.parse(body);
			} catch (err) {
				return sendResponse(400, {}, 'Invalid JSON in request body');
			}
		}
		const { title, content } = body;

		if (!title || !content) {
			return sendResponse(400, {}, 'Both title and content are required');
		}

		// Handle SK logic like deletePost
		const skPostId = postId.startsWith('POST#') ? postId.slice(5) : postId;
		const pk = `USER#${userId}`;
		const sk = `POST#${skPostId}`;

		console.log('DEBUG editPost:', {
			pk,
			sk,
			title,
			content,
		});

		// Check if item exists first
		const getResult = await dynamo
			.getItem({
				TableName: 'cloud-db',
				Key: { pk: { S: pk }, sk: { S: sk } },
			})
			.promise();

		if (!getResult.Item) {
			return sendResponse(404, {}, 'Post not found or you do not own it');
		}

		// Update DynamoDB
		await dynamo
			.updateItem({
				TableName: 'cloud-db',
				Key: { pk: { S: pk }, sk: { S: sk } },
				UpdateExpression: 'SET title = :title, content = :content',
				ExpressionAttributeValues: {
					':title': { S: title },
					':content': { S: content },
				},
			})
			.promise();

		return sendResponse(200, {}, 'Post has been edited!');
	} catch (err) {
		console.error('editPost error:', err);
		return sendResponse(500, {}, 'Internal server error');
	}
}

export const handler = middy(editPost).use(errorHandler());
