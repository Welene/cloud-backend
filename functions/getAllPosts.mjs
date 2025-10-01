// GET all posts, global -- front page
// import AWS from 'aws-sdk';
// import middy from '@middy/core';
// import { sendResponse } from '../responses/sendResponse.mjs';
// import { errorHandler } from '../middlewares/errorHandler.mjs';

// const dynamo = new AWS.DynamoDB();
// const TABLE_NAME = 'cloud-db';

// async function getAllPosts(event) {
// 	const result = await dynamo
// 		.query({
// 			TableName: 'cloud-db',
// 			IndexName: 'GlobalGsi', // put the same name in serverless doc?
// 			KeyConditionExpression: 'pk = :pk',
// 			ExpressionAttributeValues: {
// 				':pk': { S: 'POST' }, // the global GSI SK so no scan is needed
// 			},
// 			ScanIndexForward: false, // newest posts first as always
// 		})
// 		.promise();

// 	const posts = result.Items.map((item) => ({
// 		postId: item.sk.S, // or extract if you prefixed it
// 		userId: item.userId?.S || '',
// 		username: item.username?.S || '',
// 		title: item.title?.S || '',
// 		content: item.content?.S || '',
// 		createdAt: item.createdAt?.S || '',
// 	}));

// 	return sendResponse(200, posts, 'All posts');
// }

import AWS from 'aws-sdk';
import middy from '@middy/core';
import { sendResponse } from '../responses/sendResponse.mjs';
import { errorHandler } from '../middlewares/errorHandler.mjs';

const dynamo = new AWS.DynamoDB();
const TABLE_NAME = 'cloud-db';
const GSI_NAME = 'GlobalGsi';

async function getAllPosts(event) {
	const result = await dynamo
		.query({
			TableName: TABLE_NAME,
			IndexName: GSI_NAME,
			KeyConditionExpression: 'pk = :pk',
			ExpressionAttributeValues: { ':pk': { S: 'POST' } },
			ScanIndexForward: false,
		})
		.promise();

	const posts = (result.Items || []).map((item) => ({
		postId: item.sk.S,
		userId: item.userId?.S || '',
		username: item.username?.S || '',
		title: item.title?.S || '',
		content: item.content?.S || '',
		createdAt: item.createdAt?.S || '',
	}));

	return sendResponse(200, posts, 'All posts');
}

export const handler = middy(getAllPosts).use(errorHandler());
