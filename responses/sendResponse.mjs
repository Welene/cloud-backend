export function sendResponse(status, data = {}, message = null) {
	const body = { ...data };
	if (message) body.message = message;

	return { statusCode: status, body: JSON.stringify(body) };
}
