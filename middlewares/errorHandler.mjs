import { sendResponse } from '../responses/sendResponse.mjs';

export const errorHandler = () => ({
	onError: (handler) => {
		const { error } = handler;
		const status = error.statusCode || 500;
		const message = error.message || 'Internal server error';
		handler.response = sendResponse(status, {}, message);
	},
});
