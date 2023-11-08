const database = include("database_connection");

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
        WHERE user_id = :user_id;
    `;

	let params = {
		user_id: postData.user_id,
	};

	try {
		const results = await database.query(getUserThreadsSQL, params);
		console.log("Successfully got user threads");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting user threads");
		console.log(err);
		return false;
	}
}

async function uploadThread(postData) {
	let uploadThreadSQL = `
        INSERT INTO thread
		(title, description, views, likes, created_date, updated_date, short_url, active, user_id)
		VALUES
		(:title, :description, 0, 0, :created_date, :updated_date, :short_url, 1, :user_id);
    `;

	let params = {
		title: postData.title,
		description: postData.description,
		created_date: postData.created_date,
		updated_date: postData.updated_date,
		short_url: postData.short_url,
		user_id: postData.user_id,
	};

	try {
		const results = await database.query(uploadThreadSQL, params);
		console.log("Successfully inserted thread");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error getting user threads");
		console.log(err);
		return false;
	}
}

async function getThreadRow(postData) {
	let getThreadRowSQL = `
        SELECT *
        FROM thread
        WHERE thread_id = :thread_id;
    `;

	let params = {
		thread_id: postData.thread_id,
	};

	try {
		const results = await database.query(getThreadRowSQL, params);
		console.log("Successfully got thread based on thread id");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting user threads");
		console.log(err);
		return false;
	}
}

async function getThread(postData) {
	let getThreadSQL = `
        SELECT *
        FROM thread
        WHERE short_url = :short_url;
    `;

	let params = {
		short_url: postData.short_url,
	};

	try {
		const results = await database.query(getThreadSQL, params);
		console.log("Successfully got thread based on short url");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting thread");
		console.log(err);
		return false;
	}
}

async function updateThreadActive(postData) {
	let updateThreadActiveSQL = `
		UPDATE thread
		SET active = :active
		WHERE thread_id = :thread_id;
    `;

	let params = {
		active: postData.active,
		thread_id: postData.thread_id,
	};

	try {
		const results = await database.query(updateThreadActiveSQL, params);
		console.log("Successfully updated user thread acive");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error updating user thread active	");
		console.log(err);
		return false;
	}
}

async function updateThreadInfo(postData) {
	let updateThreadInfoSQL = `
		UPDATE thread
		SET title = :title, description = :description, updated_date = :updated_date
		WHERE thread_id = :thread_id;
    `;

	let params = {
		title: postData.title,
		description: postData.description,
		updated_date: postData.updated_date,
		thread_id: postData.thread_id,
	};

	try {
		const results = await database.query(updateThreadInfoSQL, params);
		console.log("Successfully got user threads");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error getting user threads");
		console.log(err);
		return false;
	}
}

async function getThreadTitleSearch(postData) {
    let getThreadTitleSearchSQL = `
		SELECT *, MATCH(title) AGAINST (:search) AS score
		FROM thread
		WHERE MATCH(title) AGAINST (:search) > 0
		ORDER BY score desc;
    `

    let params = {
		search: postData.search
    }

    try {
		const results = await database.query(getThreadTitleSearchSQL, params);
		console.log("Successfully got thread title after search");
        console.log(results[0])
		return results[0]
	} catch (err) {
		console.log("Error getting thread title after search");
	}
}

async function update_view_count(postData) {
	let updateViewCountSQL = `
	update thread
	set views = views + 1
	where thread_id = :thread_id;
    `;

	let params = {
		thread_id: postData.thread_id,
	};

	try {
		const results = await database.query(updateViewCountSQL, params);
		console.log("Successfully updated view count.");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error updating view count.");
		console.log(err);
		return false;
	}
}

async function updateLikeCount(postData) {
	let updateLikeCountSQL = `
	update thread
	set likes = likes + 1
	where short_url = :short_url;
    `;

	let params = {
		short_url: postData.short_url,
	};

	try {
		const results = await database.query(updateLikeCountSQL, params);
		console.log("Successfully updated like count.");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error updating like count.");
		console.log(err);
		return false;
	}
}

module.exports = {
	getAllThreads,
	getUserThreads,
	uploadThread,
	getThreadRow,
	updateThreadActive,
	getThread,
	updateThreadInfo,
	getThreadTitleSearch,
	update_view_count,
	updateLikeCount,
};
