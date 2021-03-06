const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongodbStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const cors = require('cors');

const User = require('./models/user');

const errorController = require('./controllers/error');

const app = express();
const pass = 'TERcle27';
//Deze moet er wel echt nog uit
const MONGODB_URI =
	`mongodb+srv://jonas:${pass}@shop-evr9v.mongodb.net/shop?retryWrites=true&w=majority`;

const store = new MongodbStore({
	uri: MONGODB_URI,
	collection: 'sessions',
});

const csrfProtection = csrf();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
	session({
		secret: 'my secret',
		resave: false,
		saveUninitialized: false,
		store: store,
	})
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
	if (!req.session.user) {
		return next();
	}
	User.findById(req.session.user._id)
		.then(user => {
			req.user = user;
			next();
		})
		.catch(err => console.log(err));
});

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn;
	res.locals.csrfToken = req.csrfToken();
	next();
});

app.use('/admin', adminRoutes);
app.use(authRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

mongoose
	.connect(MONGODB_URI)
	.then(result => app.listen(3000))
	.catch(err => {
		console.log(err);
	});
