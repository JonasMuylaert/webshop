const bcryptjs = require("bcryptjs");
const mailgun = require("mailgun-js");
const crypto = require("crypto");
const User = require("../models/user");

const DOMAIN = "sandboxa7b0f4dc4a134053a860f7865153fac1.mailgun.org";
const api_key = "cffd419accc56ed9d7f25c5eeba4e293-e5e67e3e-4aaaa192";
const mg = mailgun({ apiKey: api_key, domain: DOMAIN });

exports.getLogin = (req, res, next) => {
	let errorMessage = req.flash("error");
	let succesMessage = req.flash("succes");
	if (errorMessage.length > 0 || succesMessage.length > 0) {
		errorMessage = errorMessage[0];
		succesMessage = succesMessage[0];
	} else {
		errorMessage = null;
		succesMessage = null;
	}
	res.render("auth/login", {
		pageTitle: "Login",
		path: "/login",
		isAuthenticated: false,
		errorMessage: errorMessage,
		succesMessage: succesMessage,
	});
};

exports.postLogin = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;

	User.findOne({ email: email })
		.then(user => {
			if (!user) {
				req.flash("error", "Invalid email or password.");
				return res.redirect("/login");
			}
			bcryptjs.compare(password, user.password).then(match => {
				if (match) {
					req.session.isLoggedIn = true;
					req.session.user = user;
					return req.session.save(err => {
						console.log(err);
						res.redirect("/");
					});
				} else {
					req.flash("error", "Invalid email or password.");
					return res.redirect("/login");
				}
			});
		})
		.catch(err => console.log(err));
};

exports.getSignup = (req, res, next) => {
	let errorMessage = req.flash("error");
	let succesMessage = req.flash("succes");
	if (errorMessage.length > 0 || succesMessage.length > 0) {
		errorMessage = errorMessage[0];
		succesMessage = succesMessage[0];
	} else {
		errorMessage = null;
		succesMessage = null;
	}
	console.log(succesMessage);
	res.render("auth/signup", {
		pageTitle: "Signup",
		path: "/signup",
		isAuthenticated: false,
		succesMessage: succesMessage,
		errorMessage: errorMessage,
	});
};

exports.postSignup = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	const confirmPassword = req.body.confirmPassword;
	const data = {
		from: "admin@shop.com",
		to: email,
		subject: "test",
		html: "<h1>ELLO</h1>",
	};

	User.findOne({ email: email }).then(userDoc => {
		if (userDoc) {
			req.flash("error", "User already exists");
			return res.redirect("/signup");
		}
		return bcryptjs
			.hash(password, 12)
			.then(hashedPassword => {
				const user = new User({
					email: email,
					password: hashedPassword,
					cart: { items: [] },
				});

				return user.save();
			})
			.then(result => {
				req.flash("succes", "account has been created successfully!");
				res.redirect("/login");
				mg.messages().send(data, function (err, body) {
					console.log(body);
				});
			})
			.catch(err => console.log(err));
	});
};

exports.postLogout = (req, res, next) => {
	req.session.destroy(err => {
		console.log(err);
		res.redirect("/");
	});
};

exports.getReset = (req, res, next) => {
	let errorMessage = req.flash("error");
	let succesMessage = req.flash("succes");
	if (errorMessage.length > 0 || succesMessage.length > 0) {
		errorMessage = errorMessage[0];
		succesMessage = succesMessage[0];
	} else {
		errorMessage = null;
		succesMessage = null;
	}
	res.render("auth/reset", {
		pageTitle: "reset password",
		path: "/reset-password",
		isAuthenticated: false,
		errorMessage: errorMessage,
		succesMessage: succesMessage,
	});
};

exports.postReset = (req, res, next) => {
	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			console.log(err);
			return res.redirect("/reset");
		}
		const token = buffer.toString("hex");
		User.findOne({ email: req.body.email })
			.then(user => {
				if (!user) {
					req.flash("error", "No account with that e-mail");
					return res.redirect("/reset-password");
				}
				user.resetToken = token;
				user.resetTokenExpiration = Date.now() + 30 * 60 * 1000;
				return user.save();
			})
			.then(result => {
				const data = {
					from: "admin@shop.com",
					to: req.body.email,
					subject: "reset password",
					html: `You requested a password reset, click this <a href="http://localhost/reset-password/${token}">link</a> to set a new password`,
				};
				mg.messages().send(data, function (err, body) {
					console.log(body);
				});
				return res.redirect("/login");
			})
			.catch(err => console.log(err));
	});
};
