require("./utils");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const saltRounds = 12;

const database = include("database_connection");
const db_utils = include("database/db_utils");
const db_users = include("database/users");
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

	if (!username) {
		res.redirect("/signup?missing=username");
	} else if (!email) {
		res.redirect("/signup?missing=email");
	} else if (!password) {
		res.redirect("/signup?missing=password");
	} else {
		var success = await db_users.createUser({
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
			req.session.user_type = results[0].user_type;
			req.session.username = results[0].username;
			req.session.user_id = results[0].user_id;
			req.session.cookie.maxAge = expireTime;
			console.log(results[0].user_id);

			res.redirect("/home");
		} else {
			res.render("errorMessage", {
				error: "Failed to create user.",
			});
		}
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
				req.session.user_type = results[0].user_type;
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
	res.render("home")
});

//requires session auth
app.get("/profile", async (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
        username = req.session.username

		res.render("profile", {
            username
        })
	}
});

//requires session auth
app.get("/profile/upload", (req, res) => {
	if (!isValidSession(req)) {
		res.redirect("/");
	} else {
		res.render("thread_upload");
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

				} catch (err) {
					console.log(err);
					res.render("upload_status", {
						status: "Unsuccessful.",
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
	res.render("404");
});

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});