// GET all posts, global -- front page
import { errorHandler } from '../middlewares/errorHandler.mjs';
import middy from '@middy/core';
import { sendResponse } from '../responses/sendResponse.mjs';
import AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB();

async function getAllPosts() {
	const result = await dynamo
		.query({
			TableName: 'cloud-db',
			IndexName: 'GlobalIndexKey',
			KeyConditionExpression: 'GSI1PK = :pk',
			ExpressionAttributeValues: {
				':pk': { S: 'POST' },
			},
			ScanIndexForward: false,
		})
		.promise();

	const posts = result.Items.map((item) => ({
		postId: item.sk.S.replace('POST#', ''),
		userId: item.pk.S.replace('USER#', ''),
		username: item.username?.S || 'Unknown',
		title: item.title?.S || '',
		content: item.content?.S || '',
		createdAt: item.createdAt?.S || '',
	}));
	return sendResponse(200, { posts }, 'All posts:');
}

export const handler = middy(getAllPosts).use(errorHandler());
