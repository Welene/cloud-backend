export function sendResponse(status, data = {}, message = null) {
	const body = { ...data };
	if (message) body.message = message;

	return {
		statusCode: status,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body), // CHANGED BACK  AGAIN FROM
		// body: body,
	};
}
