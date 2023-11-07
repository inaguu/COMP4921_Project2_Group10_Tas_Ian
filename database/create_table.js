const database = include("database_connection");

async function create_user_table() {
	let createUserTableSQL = `
	CREATE TABLE IF NOT EXISTS user (
		user_id INT NOT NULL AUTO_INCREMENT,
		username VARCHAR(25) NOT NULL,
		email VARCHAR(45) NOT NULL,
		hashedPassword VARCHAR(100) NOT NULL,
		PRIMARY KEY (user_id));
	`;

	try {
		const results = await database.query(createUserTableSQL);

		console.log("Successfully created user table");
		console.log(results[0]);
		return true;
	} catch (err) {
		console.log("Error creating user table");
		console.log(err);
		return false;
	}
}

module.exports = { create_user_table };
