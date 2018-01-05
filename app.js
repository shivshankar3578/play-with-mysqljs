var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multipart = require('connect-multiparty');
var methodOverride = require('method-override');
var Clarifai = require('clarifai');
require('dotenv').load();

global.fs = require('fs');
global.path = require('path');
global.util = require('util');
global.shortid = require('shortid');
global.events = require('events');
global.url = require('url');
// global.bcrypt = require('bcrypt');
global.assert = require('assert');
global.randomString = require('randomstring');
global.FX = require('./app/functions/functions.js');
global.levelXP = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 10000, 10000, 10000, 15000, 20000, 20000, 20000, 25000, 25000, 50000, 75000, 100000, 125000, 150000, 190000, 200000, 250000, 300000, 350000, 500000, 500000, 750000, 1000000, 1250000, 1500000, 2000000, 2500000, 3000000, 5000000]
var debug = require('debug');
console.debug = console.log
Object.keys(console).forEach((v)=>{
	d =  debug(`picnicapp:${v}`);
	debug[v] = console.log.bind(console);
	console[v] = d;
})




global.Timeout = function(fn, interval) {
    var id = setTimeout(fn, interval);
    this.cleared = false;
    this.clear = function () {
        this.cleared = true;
        clearTimeout(id);
    };
}
var AWS = require('aws-sdk');
AWS.config.region = process.env.AWS_REGION
AWS.config.update({
		accessKeyId: process.env.AWS_ACCESSKEYID,
		secretAccessKey:  process.env.AWS_SECRETACCESSKEY
});

global.moment = require('moment')
global.SALT_WORK_FACTOR = 10;
global.UPLOAD_PATH = process.env.UPLOAD_PATH
global.IMAGE_BASE = process.env.IMAGE_BASE
global.BASE_URL = process.env.BASE_URL
global.DM = require('./locale/en/display_messages').APP_MESSAGES;
global.CLARIFAI = new Clarifai.App({
	clientId:  process.env.CLARIFAI_ID,
	clientSecret: process.env.CLARIFAI_SECRET
})

var mysqlParams = {
	host     : process.env.MYSQL_HOST,
	user     : process.env.MYSQL_USER,
	password : process.env.MYSQL_PASSWORD,
	database : process.env.MYSQL_DB,
	debug		 : false,
	// timezone
	multipleStatements :true
}

global.mysql = require('mysql')
global.POOL =	mysql.createPool(mysqlParams)
global.DB =	mysql.createConnection(mysqlParams)

DB.prepareStmt = POOL.prepareStmt = function (query, values) {
	if (!values) return query;
	return query.replace(/\:(\w+)/g, function (txt, key) {
		if (values.hasOwnProperty(key)) {
			return this.escape(values[key]);
		}
		return txt;
	}.bind(this));
};


var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(multipart());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
	// console.log("auth header called", req.headers)
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, osType, version, os_type, ssid, access_token ");
	next();
});
app.use(methodOverride())
// app.use(logErrors)
// app.use(clientErrorHandler)
// app.use(errorHandler)
app.all('*', (req, res, next)=>{
	// console.log("auth header called", req.headers.ssid);

	if(!req.files)
		req.files = {}

	if(req.body.email)
		req.body.email = req.body.email.toLowerCase();
	var api = req.baseUrl.split('/')[1];
	console.dir({ api: api,  body: req.body, params: req.params});
	next()
});

app.use(require("./routes/staticContent"));
app.use('/',  require('./routes/index'));
app.use(require("./routes/apiRoutes"));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next) {
	console.error("app error handler called",err);
	// set locals, only providing error in development
	//locals will get as varible on view page eg message, error varible
	// res.locals.message = err.message;
	// res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	// res.status(err.status || 500);
	// errorMessage =  err.status ? err.message : "Server Error";
	// if(req.app.get('env') === 'development') throw new Error(err);
	return res.status(301).json({ type: false, message: err.message })

});

module.exports = app;
