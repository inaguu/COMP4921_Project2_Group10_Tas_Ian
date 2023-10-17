const database = include('database_connection');

async function addPFP(postData) {
    let addPFPSQL = `
		INSERT INTO image
		(image_uuid, user_id)
		VALUES
		(:image_uuid, :user_id);
	`;

    let params = {
		image_uuid: postData.image_uuid,
		user_id: postData.user_id
	}

    try {
		const results = await database.query(addPFPSQL, params);
		console.log("Successfully added user image");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error adding user image");
		console.log(err);
		return false;
	}
}

async function getPFP(postData) {
    let getPFPSQL = `
        SELECT image_uuid
        FROM image
        WHERE user_id = :user_id
    `

    let params = {
        user_id: postData.user_id
    }

    try {
		const results = await database.query(getPFPSQL, params);
		console.log("Successfully got user image");
        console.log(results[0])
		return (results[0]);
	} catch (err) {
		console.log("Error getting user image");
		console.log(err);
		return false;
	}
}

module.exports = {
	addPFP,
    getPFP
};