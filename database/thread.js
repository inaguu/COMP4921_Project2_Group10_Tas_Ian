const database = include('database_connection');

async function getAllThreads(postData) {
    let getAllThreadsSQL = `
		SELECT *
		FROM thread;
	`;

    try {
		const results = await database.query(getAllThreadsSQL);
		console.log("Successfully got all threads");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting all threads");
		console.log(err);
		return false;
	}
}

async function getUserThreads(postData) {
    let getUserThreadsSQL = `
        SELECT *
        FROM thread
        WHERE user_id = :user_id
    `

    let params = {
        user_id: postData.user_id
    }

    try {
		const results = await database.query(getUserThreadsSQL, params);
		console.log("Successfully got user threads");
        console.log(results[0])
		return (results[0]);
	} catch (err) {
		console.log("Error getting user threads");
		console.log(err);
		return false;
	}
}

module.exports = {
	getAllThreads,
    getUserThreads
};