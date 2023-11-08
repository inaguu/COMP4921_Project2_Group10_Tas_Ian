const database = include("database_connection");

async function getAllComments(postData) {
	let getAllCommentsSQL = `
		SELECT *
		FROM comment
        WHERE thread_id = :thread_id;
	`;

	let params = {
		thread_id: postData.thread_id,
	};

	try {
		const results = await database.query(getAllCommentsSQL, params);
		console.log("Successfully got all comments");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting all comments");
		console.log(err);
		return false;
	}
}
