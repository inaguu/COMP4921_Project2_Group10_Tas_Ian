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
const db_thread = include("database/thread");
const db_comment = include("database/comment")
const url = include("public/js/url");
const success = db_utils.printMySQLVersion();

const base_url = "http://localhost:8080";
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

	console.log(email);
	console.log(password);

	var results = await db_users.getUser({
		email: email,
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
	} else {
		console.log("user not found");
		//user and password combination not found
		res.render("landing_login", {
			error: "User and password not found.",
		});
	}
});

app.post("/logout", (req, res) => {
	req.session.authenticated = false;
	req.session.destroy();
	res.redirect("/");
});

//does not require session auth - public
app.get("/home", async (req, res) => {
	let results = await db_thread.getAllThreads();

	res.render("home", {
		auth: req.session.authenticated,
		results: results,
		base_url: base_url,
	});
});

app.post("/home/search", async (req, res) => {
	let search = req.body.search

	console.log(search)

	let results = await db_thread.getThreadTitleSearch({
		search: search
	})

	res.render("home", {
		auth: req.session.authenticated,
		results: results,
		base_url: base_url,
	})
})

app.get("/thread/:code", async (req, res) => {
	let results = await db_thread.getThread({
		short_url: req.params.code,
	});
	// console.log(results);

	if (results) {
		if (results[0].active == 1) {
			await db_thread.update_view_count({
				thread_id: results[0].thread_id,
			});

			// get the comments and send to thread
			// gonna be a long? template for comments

			res.render("thread", {
				auth: req.session.authenticated,
				results: results,
			});
		} else {
			// a page to tell the user this thread is inactive
			console.log("thread is inactive");
			res.render("inactive", {
				auth: req.session.authenticated,
				title: results[0].title,
			});
		}
	} else {
		res.redirect("*");
	}
});

app.get("/thread/:short_url/like", async (req, res) => {

	await db_thread.updateLikeCount({
		short_url: req.params.short_url
	})

	let results = await db_thread.getThread({
		short_url: req.params.short_url,
	});

	if (results) {
		res.render("thread", {
			auth: req.session.authenticated,
			results: results,
		})
	}
})

// work on thread_upload css

// thread_id becuase it is the main thread and the parent_id will be null
app.post("/thread/:short_url/:thread_id/comment", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/signup")
	} else {
		let user_id = req.session.user_id
		let thread_id = req.params.thread_id
		let comment_text = req.body.comment_text

		let results = await db_comment.insertComment({
			thread_id: thread_id,
			user_id: user_id,
			comment: comment_text
		})

		if (results) {
			res.redirect("/thread/" + req.params.short_url)
		}

		
	}
})

// each comment will have a button to add comments and that post ->
// will be the comment_id when we fill the thread page with comments
// parent_id will be the comment_id
app.post("/thread/:short_url/:thread_id/:comment_id/comment", (req, res) => {

})

//requires session auth
app.get("/profile", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		username = req.session.username;
		user_id = req.session.user_id;
		let image_check = false;

		let image = await db_image.getPFP({
			user_id: user_id,
		});
		
		if (image.length == 1) {
			image_check = true;
		} else {
			console.log("there is no image_uuid")
		}

		let results = await db_thread.getUserThreads({
			user_id: user_id,
		});

		if (results) {
			if (results.length >= 1 && image_check) {
				image_uuid = image[0].image_uuid;

				res.render("profile", {
					username: username,
					image_uuid: image_uuid,
					auth: req.session.authenticated,
					results: results,
					base_url: base_url,
				});
			} else {
				res.render("profile", {
					username,
					image_uuid: false,
					auth: req.session.authenticated,
					results: results,
					base_url: base_url,
				});
			}
		}
	}
});

app.get("/profile/thread/:short_url", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let results = await db_thread.getThread({
			short_url: req.params.short_url,
		});

		if (results) {
			res.render("thread_edit", {
				auth: req.session.authenticated,
				results: results,
			});
		} else {
			console.log("results is empty");
			res.redirect("*");
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

app.post("/profile/upload/thread", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let user_id = req.session.user_id;
		let title = req.body.thread_title;
		let desc = req.body.thread_desc;
		let short_url = url.url_code();

		const date = new Date();

		let day = date.getDate();
		let month = date.getMonth() + 1;
		let year = date.getFullYear();

		let curr_date = `${day}-${month}-${year}`;
		// console.log(curr_date); // "07-11-2023"

		var results = await db_thread.uploadThread({
			title: title,
			description: desc,
			created_date: curr_date,
			updated_date: curr_date,
			short_url: short_url,
			user_id: user_id,
		});

		if (results) {
			res.redirect("/profile");
		} else {
			console.log(results);
		}
	}
});

// used for updating a thread
app.post("/profile/update/thread/:thread_id", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let title = req.body.thread_title;
		let desc = req.body.thread_desc;

		const date = new Date();

		let day = date.getDate();
		let month = date.getMonth() + 1;
		let year = date.getFullYear();

		let curr_date = `${day}-${month}-${year}`;
		// console.log(curr_date); // "07-11-2023"

		let results = await db_thread.updateThreadInfo({
			title: title,
			description: desc,
			updated_date: curr_date,
			thread_id: req.params.thread_id,
		});

		if (results) {
			res.redirect("/profile");
		} else {
			console.log(results);
		}
	}
});

// used for updating the active status of a thread
app.post("/profile/update/thread/active/:thread_id", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		let data = await db_thread.getThreadRow({
			thread_id: req.params.thread_id,
		});

		if (data[0].active == 1) {
			console.log("active to inactive");
			await db_thread.updateThreadActive({
				active: 0,
				thread_id: req.params.thread_id,
			});
			res.redirect("/profile");
		} else {
			console.log("inactive to active");
			await db_thread.updateThreadActive({
				active: 1,
				thread_id: req.params.thread_id,
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
