const EmailTemplate = require('email-templates').EmailTemplate;
const crypto = require('crypto');
const gcm= require('node-gcm');
global.gservice = new gcm.Sender(process.env.GCM_KEY);
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
		from: process.env.SMTP_FROM,
		host: process.env.SMTP_HOST, // hostname
		service: process.env.SMTP_SERVICE,
		auth: {
				user: process.env.SMTP_AUTH_USER,
				pass: process.env.SMTP_AUTH_PASS
		}
});

const { UserInfo  } = require('./classes'); 
Array.prototype.unique = function() {
	return this.filter(function (value, index, self) {
		return self.indexOf(value) === index;
	});
}


module.exports = {

	apnSend: function(user_id, key, msg, payload) {
		
		POOL.query("select * from users where id= ? ",[ user_id], (err, users)=>{
			console.log(err);
			if(err) return
			if(!users.length) return 
			var	user = new UserInfo(users[0]) 
			user.addNotif();
			// check user allow notif
			console.log("apn called", user.name, user.device_token);
			// console.dir(user.notif)
			// if(!user.notif[key]) return 
				var data= Object.assign({
					push_type:key, 
					message:msg,
				},payload)
				data.data = data
			console.log(`@@@@@@@@`,data);
			var sender = new gcm.Sender(process.env.GCM_KEY);
			var message = new gcm.Message({
					data: data,
					notification: {
							title: 'Picnic',
							icon: "ic_launcher",
							body: msg,
							push_type:key, 
							click_action:'ActiveGames',							 
							data:data
						}
			});
			sender.send(message, { registrationTokens:  [user.device_token] }, (err, response)=> {
				 console.error(err, response);
			});
		})
	},


	getUser: function(p, cb ){
		var sql = "select users.*, countries.alpha_2 as flag, countries.name as country_name from users left join countries on users.country =countries.alpha_2 where users.email = ? or users.mobile = ? or users.facebook_id = ? or users.id = ?"
		POOL.query(sql, [p.email, p.mobile, p.facebook_id, p.user_id], (err, result, fields)=>{
			if(err) return cb(err)
			return cb(null, result.reduce((acc, cur, i)=> {  return cur; }, 0))
		})
	},
	GetActiveGames: function(p,cb){

			var sql =
				POOL.prepareStmt(
				`select missions.id as mission_id, missions.is_bot, missions.is_friend, unix_timestamp(missions.created_at) as created_at, ${moment().unix()} as current_server_time, opponent.name as opponent_name, opponent.id as opponent_id, 1 as level, missions.status, clarify_results.created_at  as click_time, clarify_results.picture as win_picture,
				opponent.picture AS opponent_picture,
				concat('${IMAGE_BASE}', 'flags/64x64/', opponent.country, '.png') as country_flag,
				games.name as game_name, games.picture as game_picture, games.timeout as game_timeout,
				CASE missions.winner WHEN :user_id THEN 'won' WHEN 0 THEN 'expired' ELSE 'lost' END  AS mission_result
				from missions
				left join clarify_results on clarify_results.mission_id = missions.id
				inner join games on games.id = missions.game_id
				inner join users as opponent on opponent.id = CASE missions.opponent_id WHEN :user_id THEN missions.player_id ELSE missions.opponent_id END
				where (missions.player_id = :user_id and missions.player_has_seen = 0) or (missions.opponent_id = :user_id and  missions.opponent_has_seen = 0)
				limit 6`
				, p );
				// console.log(sql);
			POOL.query(sql, (err, results)=>{
				// console.log(err);
				return cb(err,results)
			})
	},

	// download: function(uri,label, thumb, next , cb){
	// 	request.head(uri, function(err, res, body){
	// 		console.log('content-type:', res.headers['content-type']);
	// 		console.log('content-length:', res.headers['content-length']);
	// 		request(uri).pipe(fs.createWriteStream(filename)).on('close', cb());
	// 	});
	// },

	crypto: function(text, type) {
		var algorithm = 'aes256'; // or any other algorithm supported by OpenSSL
		var key = 'password';
		if(type.toString() === 'encrypt') {
				var cipher = crypto.createCipher(algorithm, key);
				var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
				return encrypted;
		} else {
				var decipher = crypto.createDecipher(algorithm, key);
				var decrypted = decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
				return decrypted;
		}
	},

	sendMail: function(template, subject, email, email_data, cb) {
		console.log("sendMail called");
		if(!email) return cb(null, 1);
		var template = new EmailTemplate(path.join(__dirname, '../../templates/', template));
		// An example user object with formatted email function
		if(!template) return cb(new Error("template not found"))
		var locals = {
				custom: email_data
		}
		locals.site_title = 'process.env.SITE_TITLE';
		locals.email_logo = 'process.env.LOGO_PATH';
		// Send a single email
		template.render(locals, function(err, results) {
			if(err) return cb(err);
				transport.sendMail({
						from: process.env.FROM_MAIL,
						to: email,
						subject: subject,
						html: results.html,
						text: results.text
					}, function(err, responseStatus) {
						if(err) return cb(err)
						return cb(null, responseStatus);
				});
		});
	},

	uploadFile: function(file, label, thumb, cb){
		 console.log("uploadFile called", file);
		 if(!file || !label)  return cb(null,null);
		 var source = file.path;
		 var filename = randomString.generate() +file.name.substr( file.name.lastIndexOf('.'), file.name.length);
		 target = path.join( UPLOAD_PATH, label, filename);
		 fs.readFile(source, function (err, data) {
				if(err) return cb(err);
				fs.writeFile(target, data, function (err) {
					 if(err) return cb(err);
					//  if(thumb)
					//    createThumb(filename, label, function(done){
					//      return cb(filename)
					//    })
					 return cb(null, filename);
					});
		 });
	}


};
