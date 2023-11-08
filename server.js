require("./utils");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const database = include("database_connection");
const db_utils = include("database/db_utils");
const db_tables = include("database/create_table");
const db_users = include("database/users");
const db_image = include("database/image");
const db_thread = include("database/thread")
// const db_uploads = include("database/uploads");
const success = db_utils.printMySQLVersion();

const port = process.env.PORT || 8080;

const app = express();

const expireTime = 60 * 60 * 1000; //expires after 1 hour  (hours * minutes * seconds * millis)

/* secret information section */
const cloudinary = require("cloudinary");
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_CLOUD_KEY,
	api_secret: process.env.CLOUDINARY_CLOUD_SECRET,
});

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { v4: uuid } = require("uuid");

const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const mongodb_host = process.env.MONGODB_REMOTE_HOST;

const node_session_secret = process.env.NODE_SESSION_SECRET;

app.set("view engine", "ejs");

app.use(
	express.urlencoded({
		extended: false,
	})
);

//!! Need to include both MongoDB accounts? !!
var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority`,
	crypto: {
		secret: mongodb_session_secret,
	},
});
app.use(
	session({
		secret: node_session_secret,
		store: mongoStore, //default is memory store
		saveUninitialized: false,
		resave: true,
	})
);

app.get("/", (req, res) => {
	res.render("landing_login", {
		error: "none",
	});
});

app.get("/signup", (req, res) => {
	var missingInfo = req.query.missing;
	res.render("signup", {
		missing: missingInfo,
	});
});

app.post("/submituser", async (req, res) => {
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;

	var hashedPassword = bcrypt.hashSync(password, saltRounds);

	let success = await db_tables.create_user_table();
	if (success) {
		success = await db_users.createUser({
			username: username,
			email: email,
			hashedPassword: hashedPassword,
		});
		console.log(username);
		console.log(email);
		console.log(hashedPassword);

		if (success) {
			var results = await db_users.getUser({
				email: email,
				hashedPassword: password,
			});
			req.session.authenticated = true;
			req.session.username = results[0].username;
			req.session.user_id = results[0].user_id;
			req.session.cookie.maxAge = expireTime;
			console.log(results[0].user_id);

			res.redirect("/home");
		} else {
			// res.render("errorMessage", {
			// 	error: "Failed to create user.",
			// });
			console.log("error in creating the user");
		}
	} else {
		console.log("Server: Error creating tables in database.");
	}
});

app.post("/loggingin", async (req, res) => {
	var email = req.body.email;
	var password = req.body.password;

	var results = await db_users.getUser({
		email: email,
		hashedPassword: password,
	});

	if (results) {
		if (results.length == 1) {
			//there should only be 1 user in the db that matches
			if (bcrypt.compareSync(password, results[0].hashedPassword)) {
				req.session.authenticated = true;
				req.session.username = results[0].username;
				req.session.user_id = results[0].user_id;
				req.session.cookie.maxAge = expireTime;

				res.redirect("/home");
				return;
			} else {
				console.log("invalid password");
			}
		} else {
			console.log(
				"invalid number of users matched: " + results.length + " (expected 1)."
			);
			res.render("landing_login", {
				error: "User and password not found.",
			});
			return;
		}
	}

	console.log("user not found");
	//user and password combination not found
	res.render("landing_login", {
		error: "User and password not found.",
	});
});

app.post("/logout", (req, res) => {
	req.session.authenticated = false;
	req.session.destroy();
	res.redirect("/");
});

//does not require session auth - public
app.get("/home", async (req, res) => {

	let results = await db_thread.getAllThreads()

	res.render("home", {
		auth: req.session.authenticated,
		results: results
	});
});

app.get("/thread/:code", (req, res) => {
	res.render("thread")
})

//requires session auth
app.get("/profile", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		username = req.session.username;
		user_id = req.session.user_id;

		let image = await db_image.getPFP({
			user_id: user_id,
		});

		req.session.image_uuid = image[0].image_uuid

		// let results = await db_thread.getUserThreads({
		// 	user_id: user_id
		// })

		if (image) {
			if (image.length == 1) {
				image_uuid = image[0].image_uuid;

				res.render("profile", {
					username: username,
					image_uuid: image_uuid,
					auth: req.session.authenticated,
					// results: results
				});
			} else {
				res.render("profile", {
					username,
					image_uuid: false,
					auth: req.session.authenticated,
					// results: results
				});
			}
		}
	}
});

//requires session auth
app.get("/profile/upload", (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		res.render("thread_upload", {
			auth: req.session.authenticated,
		});
	}
});

app.post("/profile/upload/thread", (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let user_id = req.session.user_id
		let title = req.body.thread_title
		let desc = req.body.thread_desc
		let curr_date = new Date().toDateString();
		
		// var results = await db_uploads.threadUpload({
		// 	title: title,
		// 	description: desc,
		// 	created_date: curr_date,
		// 	edit_date: curr_date,
		// 	user_id: user_id
		// })

		// if (results) {
		 	res.redirect("/profile")
		// } else {
		// 	console.log(results)
		// }
	}
})

// used for updating a thread
app.post("/profile/update/thread/:thread_id", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let data = await db_uploads.getUploadRow({
			uploads_id: req.params.uploads_id,
		});

		if (data[0].active == 1) {
			await db_uploads.updateActive({
				active: 0,
				uploads_id: req.params.uploads_id,
			});
			res.redirect("/profile");
		} else {
			await db_uploads.updateActive({
				active: 1,
				uploads_id: req.params.uploads_id,
			});
			res.redirect("/profile");
		}
	}
});

// used for updating the active status of a thread
app.post("/profile/update/thread/active/:thread_id", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let data = await db_uploads.getUploadRow({
			uploads_id: req.params.uploads_id,
		});

		if (data[0].active == 1) {
			await db_uploads.updateActive({
				active: 0,
				uploads_id: req.params.uploads_id,
			});
			res.redirect("/profile");
		} else {
			await db_uploads.updateActive({
				active: 1,
				uploads_id: req.params.uploads_id,
			});
			res.redirect("/profile");
		}
	}
});

app.get("/profile/upload/image", (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		res.render("pfp_upload", {
			auth: req.session.authenticated,
		});
	}
});

//requires session auth
//this is for uploading a user pfp
app.post("/profile/upload/image", upload.single("image"), async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let buf64 = req.file.buffer.toString("base64");
		user_id = req.session.user_id;

		stream = cloudinary.uploader.upload(
			"data:image/octet-stream;base64," + buf64,
			async (result) => {
				try {
					// the image ID
					console.log(result.public_id);

					let success = await db_image.addPFP({
						image_uuid: result.public_id,
						user_id: req.session.user_id,
					});

					if (success) {
						res.redirect("/profile");
					} else {
						res.render("upload_status", {
							status: "Unsuccessful.",
							auth: req.session.authenticated,
						});
					}
				} catch (err) {
					console.log(err);
					res.render("upload_status", {
						status: "Unsuccessful.",
						auth: req.session.authenticated,
					});
				}
			}
		);
	}
});

function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	}
	return false;
}

function sessionValidation(req, res, next) {
	if (!isValidSession(req)) {
		req.session.destroy();
		res.redirect("/");
		return;
	} else {
		next();
	}
}

app.use("/profile", sessionValidation);

app.use(express.static("public"));
app.use(express.static(__dirname + "/public"));

app.get("*", (req, res) => {
	res.status(404);
	res.render("404", {
		auth: req.session.authenticated,
	});
});

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});
