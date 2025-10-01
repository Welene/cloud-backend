//GET (has to be logged in), see all posts by a user

import AWS from 'aws-sdk';
import middy from '@middy/core';
import { errorHandler } from '../middlewares/errorHandler.mjs';
import { sendResponse } from '../responses/sendResponse.mjs';

const dynamo = new AWS.DynamoDB();

async function getUserPosts(event) {
	const { userId } = event.pathParameters;

	if (!userId) {
		const error = new Error('you need an userId');
		error.statusCode = 400;
		throw error;
	}

	const result = await dynamo // query after ALL posts by ONE user
		.query({
			TableName: 'cloud-db',
			KeyConditionExpression: 'pk = :pk AND begins_with(sk, :postPrefix)',
			ExpressionAttributeValues: {
				':pk': { S: `USER#${userId}` },
				':postPrefix': { S: 'POST#' }, // gets all POST sk's and ignores the PROFILE sk in the table
			},
			ScanIndexForward: false, // shows the most recent post first
		})
		.promise();

	const posts = result.Items.map((item) => ({
		postId: item.sk.S.replace('POST#', ''),
		userId,
		username: item.username?.S || '', // -----------------------------------------------------------------------------------------------------------ADDED USERNAME HERE
		title: item.title?.S || '',
		content: item.content?.S || '',
		createdAt: item.createdAt?.S || '',
	}));

	// return sendResponse(200, posts, `Posts for user ${userId}`);
	return sendResponse(200, { posts, message: `Posts for user ${userId}` }); //-----------WRAPPING BECAUSE RESPONSE IS [] NOT {}, now axios will get [] & CAN MAP THROUGH
}

export const handler = middy(getUserPosts).use(errorHandler());
