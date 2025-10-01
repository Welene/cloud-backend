// import { sendResponse } from '../responses/sendResponse.mjs';

// export const errorHandler = () => ({
// 	onError: (handler) => {
// 		const { error } = handler;
// 		const status = error.statusCode || 500;
// 		const message = error.message || 'Internal server error';
// 		handler.response = sendResponse(status, {}, message);
// 	},
// });

import { sendResponse } from '../responses/sendResponse.mjs';

export const errorHandler = () => ({
	onError: (handler) => {
		const { error, event } = handler;

		console.error('=== Lambda Error ===');
		console.error('Message:', error.message);
		console.error('Stack:', error.stack);
		console.error('Event:', JSON.stringify(event, null, 2));

		const status = error.statusCode || 500;
		const message = error.message || 'Internal server error';

		handler.response = sendResponse(status, {}, message);
	},
});
