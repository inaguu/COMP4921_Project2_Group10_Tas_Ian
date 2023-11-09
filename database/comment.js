const database = include("database_connection");

async function insertComment(postData) {
	let insertCommentSQL = `
	INSERT INTO comment (thread_id, user_id, comment) 
	VALUES (:thread_id, :user_id, :comment);
	`;

	let params = {
		thread_id: postData.thread_id,
		user_id: postData.user_id,
		comment: postData.comment,
	};

	try {
		const results = await database.query(insertCommentSQL, params);
		console.log("Successfully added a comment.");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error adding a comment.");
		console.log(err);
		return false;
	}
}

async function insertReply(postData) {
	let insertReplySQL = `
	INSERT INTO comment (thread_id, user_id, parent_id, comment) 
	VALUES (:thread_id, :user_id, :parent_id, :comment);

	`;

	let params = {
		thread_id: postData.thread_id,
		user_id: postData.user_id,
		parent_id: postData.parent_id,
		comment: postData.comment,
	};

	try {
		const results = await database.query(insertReplySQL, params);
		console.log("Successfully added a reply.");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error adding a reply.");
		console.log(err);
		return false;
	}
}

async function getParentComments(postData) {
	let getParentCommentsSQL = `
		SELECT comment_id
		FROM comment
        WHERE thread_id = :thread_id AND parent_id is null;
	`;

	let params = {
		thread_id: postData.thread_id,
	};

	try {
		const results = await database.query(getParentCommentsSQL, params);
		console.log("Successfully got all parent comments");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting parent comments");
		console.log(err);
		return false;
	}
}

async function getChildComments(postData) {
	let getChildCommentsSQL = `
		with recursive comment_hierarchy as 
			(select comment_id, thread_id, user_id, parent_id, comment, 0 as depth
			from comment
			where comment_id = :comment_id
			union all
			select C.comment_id, C.thread_id, C.user_id, C.parent_id, C.comment, H.depth+1
			from comment_hierarchy H
			join comment C on (H.comment_id = C.parent_id)
			)
		select * from comment_hierarchy;
		order by comment_id
	`;

	let params = {
		comment_id: postData.comment_id,
	};

	try {
		const results = await database.query(getChildCommentsSQL, params);
		console.log("Successfully got parent and all child comments");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error getting parent and child comments");
		console.log(err);
		return false;
	}
}

async function deleteOwnComment(postData) {
	let deleteOwnCommentSQL = `
		UPDATE comment
		SET comment = 'Deleted by user.'
		where comment_id = :comment_id;
	`;

	let params = {
		comment_id: postData.comment_id,
	};

	try {
		const results = await database.query(deleteOwnCommentSQL, params);
		console.log("Successfully deleted own comment.");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error deleting own comment.");
		console.log(err);
		return false;
	}
}

async function deleteOtherComment(postData) {
	let deleteOtherCommentSQL = `
		UPDATE comment
		SET comment = 'Deleted by Original Poster.'
		where comment_id = :comment_id;
	`;

	let params = {
		comment_id: postData.comment_id,
	};

	try {
		const results = await database.query(deleteOtherCommentSQL, params);
		console.log("Successfully deleted other comment.");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error deleting other comment.");
		console.log(err);
		return false;
	}
}

async function editComment(postData) {
	let editCommentSQL = `
		UPDATE comment
		SET comment = :update_comment
		where comment_id = :comment_id;
	`;

	let params = {
		comment_id: postData.comment_id,
		update_comment: postData.update_comment,
	};

	try {
		const results = await database.query(editCommentSQL, params);
		console.log("Successfully updated comment.");
		console.log(results[0]);
		return results[0];
	} catch (err) {
		console.log("Error updating comment.");
		console.log(err);
		return false;
	}
}

module.exports = {
	insertComment,
	insertReply,
	getParentComments,
	getChildComments,
	deleteOwnComment,
	deleteOtherComment,
	editComment,
};
