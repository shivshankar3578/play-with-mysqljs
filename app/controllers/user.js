	var AWS = require('aws-sdk');
const { UserInfo,
	UserShortInfo,
	MissionInfo
 } = require('../functions/classes');

exports.sendFriendReq = function(req, res, next) {

	var postData = req.body;
	postData.from_user = req.user.id;
	console.log("sendFriendReq called",req.user.id);

	var sql =
		`select * from friends where (from_user = :from_user and to_user = :to_user) or (from_user = :to_user and to_user =:from_user) `

	POOL.query(POOL.prepareStmt(sql, postData), (err, result)=>{
		if(err) return next(err)

		if(result.length)
			return res.status(203).json({
				type:false,
				message:"Already invitated"
			})

		POOL.query("insert into friends set ?", postData, (err, result)=>{
			if(err) return next(err)

			 res.status(200).json({
				type:true,
				message:"FriendReq sent"
			})
		var msg = `${req.user.name}  send you friend request`
		FX.apnSend(req.body.to_user,'pn_new_friend_request',msg, {user_id:req.user.id} )
		})

	})
}


exports.acceptFriendReq = function(req, res, next) {
	console.log("acceptFriendReq called",req.params);
	var sql = POOL.prepareStmt(`
		update friends set status = 1, updated_by = :user_id
		where (from_user = :user_id and to_user = :client_id) or ( from_user=:client_id and to_user=:user_id)`
		,{user_id:req.user.id, client_id:req.params.friend_req_id})
	console.log(sql);
	POOL.query(sql, (err,done)=>{
		if(err) return next(err)
		res.status(200).json({
			type:true,
			message:"FriendReq accepted"
		})
		var msg = `${req.user.name}  accepted your friend request`
		FX.apnSend(req.params.friend_req_id, 'pn_accept_friend_request', msg, {user_id:req.user.id})
	})

}

exports.unfriend = function(req, res, next) {
	console.log("unfriend called",req.params);
	var sql = POOL.prepareStmt(`
		delete FROM friends
		where (from_user = :user_id and to_user = :client_id) or ( from_user=:client_id and to_user=:user_id)`
		,{user_id:req.user.id, client_id:req.params.friend_req_id})
	console.log(sql);
	POOL.query(sql, (err,done)=>{
		if(err) return next(err)
		res.status(200).json({
			type:true,
			message:"unfriend done"
		})
	})

}

exports.appFeedback = function(req, res, next) {
	console.log("appFeedback called");
	var feedback = {
		user_id: req.user.id,
		message:req.body.message,
		created_at: new Date()
	}
	POOL.query("insert into app_feedback set ? ", feedback, (err,done)=>{
		if(err) return next(err)

		return res.status(200).json({
			type:true,
			message:"Thank you your feedback"
		})
	})

}


exports.declineFriendReq = function(req, res, next) {
	console.log("declineFriendReq called",req.params);
	var sql = mysql.format("DELETE FROM `friends` WHERE to_user =? and from_user = ? ", [req.user.id, req.params.friend_req_id])
	console.log(sql);
	POOL.query(sql, (err,done)=>{
		if(err) return next(err)

		res.status(200).json({
			type:true,
			message:"FriendReq declined"
		})
	
	})

}


exports.FriendReqList = function(req, res, next) {
	console.log("FriendReqList called");

	var sql = POOL.prepareStmt(
		`select users.name, users.id as user_id, f1.id as request_id, f1.status as request_status,users.picture as picture
		from friends as f1
		inner join users on users.id = f1.from_user
		where f1.status=0 and f1.to_user=:user_id `
		,{user_id:req.user.id})
		console.log(sql);
	POOL.query(sql, (err,results)=>{
		if(err) return next(err)

		return res.status(200).json({
			type:true,
			data:results,
			message:"FriendReqList found"
		})
	})
}



exports.countryList = function(req, res, next) {

	console.log("countryList called");

	POOL.query(`select *, concat('${BASE_URL}', 'flags/64x64/', alpha_2, '.png') as flag  from countries `, (err, results)=>{
		if(err) return next(err)

		return res.status(200).json({
			type:true,
			data:results,
			message:"country list found"
		})

	})
}


exports.sendOtp = function(req, res, next) {

	var postData = req.body;
	console.log("sendOtp called");

 // 	var otp = randomString.generate({
	// 	length: 6,
	// 	charset: 'numeric'
	// });
	var otp = 1234;
	var mobile = postData.country_code + postData.mobile;

	var sns = new AWS.SNS();
	var params = {
			Message: `${otp} is your confirmation code for Picnic App `,
			MessageStructure: 'string',
			PhoneNumber: mobile,
			Subject: 'PICNIC',
			// TopicArn:'arn:aws:sns:us-west-2:688500609298:PICNICSMS'
	};

	sns.publish(params, function(err, data) {
		if(err) return next(err)
		// console.log(data);
		POOL.query("update users set otp = ?, mobile = ? where id= ?", [otp, mobile, req.user.id], (err, done)=>{
			if(err) return next(err)

			return res.status(200).json({
				type:true,
				message:"Otp sent"
			})

		 })

	});

}

exports.verifyMobile = function(req, res, next) {

	var postData = req.body;
	console.log("verifyMobile called");

	// NOTE after send otp verifyMobile auth called and you get req.user.otp
	if(req.user.otp != postData.otp)
		return res.status(203).json({
			type:false,
			message:"Otp not match"
		})

	POOL.query("update users set is_mobile_verified = 1 where id= ?", [req.user.id], (err, done)=>{
		if(err) return next(err)
		req.user.is_mobile_verified = 1
		return res.status(200).json({
			type:true,
			data: new UserInfo(req.user),
			message:"Mobile is verified Successfully"
		})

	})

}


exports.sendInvitation = function(req, res, next) {

	var postData = req.body;
	postData.from_user = req.user.id;
	console.log("sendInvitation called",req.user.id);

	var sql =
		`select * from invitations where (from_user = :from_user and to_user = :to_user) or (from_user = :to_user and to_user =:from_user)`

	POOL.query(POOL.prepareStmt(sql, postData), (err, result)=>{
		if(err) return next(err)

		if(result.length)
			return res.status(203).json({
				type:false,
				message:"Already invitated"
			})

		POOL.query("insert into invitations set ?", postData, (err, result)=>{
			if(err) return next(err)

			res.status(200).json({
				type:true,
				message:"Invitation sent"
			})
		var msg =  `${req.user.name}  invitation you to play`
		FX.apnSend(req.body.to_user, 'pn_invitation', msg, {user_id:req.user.id})

		})

	})
}


exports.acceptInvitation = function(req, res, next) {
	console.log("acceptInvitation called",req.params.invitation_id);

	POOL.query("update invitations set status = 1, updated_by = ? where id = ? ", [req.user.id, req.params.invitation_id], (err,done)=>{
		if(err) return next(err)

		return res.status(200).json({
			type:true,
			message:"Invitation accepted"
		})

	})

}


exports.declineInvitation = function(req, res, next) {
	console.log("declineInvitation called");

	POOL.query("update invitations set status = -1, updated_by =? where id = ? ", [req.user.id, req.params.invitation_id], (err,done)=>{
		if(err) return next(err)

		return res.status(200).json({type:true, message:"Invitation declined"})
	})

}


exports.editProfile = function(req, res, next) {
	var postData = req.body
	console.log("editProfile called", req.user.id);

	if(postData.picture)
			postData.picture = process.env.AWS_IMAGE_BASE + postData.picture
	Object.keys(postData)
	.forEach((key) => (postData[key] == '') && delete postData[key]);

	Object.assign(req.user, postData)

	postData.user_id = req.user.id
	var sql =POOL.prepareStmt(`update users set picture =:picture, bio= :bio where id= :id`, req.user)
		console.log(sql);
	POOL.query(sql, (err, done)=>{
		if(err) return next(err)

		var userData = new UserInfo(Object.assign(req.user, postData))
		userData.addNotif();
		return res.status(200).json({
			type:true,
			data:userData,
			message:"Profile update Successfully"
		})

	})
}


exports.viewProfile = function(req, res, next) {
	console.log("viewMission called",req.user.id	);
	var sql =POOL.prepareStmt(
		`SELECT missions.winner,missions.id as mission_id, games.name as game_name, users.name as opponent_name,  clarify_results.picture, missions.win_time from missions 
		inner join games on missions.game_id = games.id 
		inner join users  on users.id =  CASE missions.opponent_id WHEN missions.winner THEN missions.player_id ELSE missions.opponent_id END
			left join clarify_results on clarify_results.id = missions.picture_id
			where CASE missions.player_id WHEN :user_id THEN player_id  ELSE opponent_id END = :user_id and missions.winner!=0 order by missions.id desc ;
		SELECT users.name, users.id as user_id,users.xp, users.level,  users.picture from friends inner join users on users.id =  CASE friends.to_user WHEN :user_id THEN friends.from_user ELSE friends.to_user END where (friends.to_user=:user_id or friends.from_user=:user_id) and friends.status=1;
		SELECT users.*, countries.alpha_2 as flag, countries.name as country_name from users left join countries on users.country =countries.alpha_2 where users.id=:user_id;
		SELECT *,trophies.id as trophy_id  FROM user_trophies left join  trophies on user_trophies.trophy_id = trophies.id and user_trophies.user_id = :user_id;`, 
			{
				user_id: req.params.user_id
			})
		console.log(sql);
	POOL.query(sql, (err, results)=>{
		if(err) return next(err)
		// console.log(myMissions);
		var myMissions = results[0]
		var friends = results[1]
		var user = results[2][0];
		var user_trophies = results[3];
		var won =  myMissions.filter(v=> {
			console.log(v.winner,req.user.id)
			if(v.winner == req.params.user_id) return true

		});
		won.sort((p,q)=>{
			return p.winner_time-q.winner_time
		})
		var game_played = myMissions.length
		var game_won = won.length	
		var game_draw = myMissions.filter(v=> {if(!v.winner) return true}).length	
		var game_lost = game_played - (game_draw+game_won);
		winning_streak = req.user.winning_streak;
		var stats = {
			game_played    : game_played,
			game_won       : game_won,
			game_lost      : game_lost,
			game_draw      : game_draw,
			winning_streak : winning_streak,
			user_trophies : user_trophies.length,
			win_ratio : Math.round(game_won/game_played),
			fastest_game : won[0] ? won[0].win_time : '0'
		}
		// console.log(user);
		var result = {
			stats : stats,
			missions : myMissions,
			user : new UserInfo(user),
			friends : friends
		}
		if(won.length) result.fastest_game = won[0]		
		//mission.win_time =  `${Math.floor(win_time/60)}m ${win_time%60}s`
		res.status(200).json({
			type:true,
			data:result,
			message:"friends found"
		})
		
	})
}

	//	seach users by array of facebook_id
exports.searchByFB = function(req, res, next) {
	var postData = req.body
	console.log("searchByFB called", postData, typeof postData.search);
	var search = []
	//left join friends as f1 on u1.id =  CASE f1.to_user WHEN :user_id THEN f1.from_user ELSE f1.to_user END where f1.to_user=  or f1.from_user= :user_id
	postData.search.forEach((v)=>{ search.push(v.id) })
	if(!search.length)
		search = ['must-not-match']
 	var sql =POOL.prepareStmt(
		`SELECT u1.id as user_id, u1.name, u1.picture, u1.facebook_id, u1.mobile,f1.*, f1.id as fid,(SELECT count(id) FROM friends WHERE friends.status=1 and
			(from_user IN (SELECT distinct CASE WHEN from_user = u1.id THEN to_user ELSE from_user END FROM friends where to_user = u1.id or from_user=u1.id) AND to_user = :user_id  and status=1)
				or
			(to_user IN (SELECT distinct CASE WHEN from_user = u1.id THEN to_user ELSE from_user END FROM friends where to_user = u1.id or from_user=u1.id) AND from_user = :user_id and status=1 ) ) as mutual_friends
		FROM users as u1 left join friends as
		f1 on u1.id =  CASE f1.to_user WHEN :user_id THEN f1.from_user ELSE f1.to_user END AND (f1.to_user = :user_id OR f1.from_user = :user_id)  WHERE u1.facebook_id IN (:search) and u1.id!=:user_id `
		,{
			user_id:req.user.id,
			search: search
		})
		console.log(sql);
	POOL.query(sql, (err, friends)=>{
		if(err) return next(err)

		// console.log(friends);

		friends.forEach((v,i)=>{
			v.isReqSent =  0
			v.isReqReceived = 0

			if(!v.status)
				if(v.to_user == req.user.id)
					v.isReqReceived = 1
				else if(v.from_user == req.user.id)
					v.isReqSent = 1
		})

		res.status(200).json({
			type:true,
			data:friends,
			message:"friends found"
		})

	})
}

//	seach users by array of facebook_id
exports.searchByMobile = function(req, res, next) {
	var postData = req.body
	console.log("searchByMobile called", postData, typeof postData.search);
	var search = []
	postData.search.forEach((v)=>{ search.push(v.phone) })
	if(!search.length)
		search = ['must-not-match']

	var sql =POOL.prepareStmt(
		`SELECT u1.id as user_id, u1.name, u1.picture, u1.facebook_id, u1.mobile,f1.*, f1.id as fid,(SELECT count(id) FROM friends WHERE friends.status=1 and
			(from_user IN (SELECT distinct CASE WHEN from_user = u1.id THEN to_user ELSE from_user END FROM friends where to_user = u1.id or from_user=u1.id) AND to_user = :user_id  and status=1)
				or
			(to_user IN (SELECT distinct CASE WHEN from_user = u1.id THEN to_user ELSE from_user END FROM friends where to_user = u1.id or from_user=u1.id) AND from_user = :user_id and status=1 ) ) as mutual_friends
		FROM users as u1 left join friends as
		f1 on u1.id =  CASE f1.to_user WHEN :user_id THEN f1.from_user ELSE f1.to_user END AND (f1.to_user = :user_id OR f1.from_user = :user_id)  WHERE u1.mobile IN (:search) and u1.id!=:user_id `
		,{
			user_id:req.user.id,
			search: search
		})
	console.log(sql);

	POOL.query(sql, (err, friends)=>{
		if(err) return next(err)

		friends.forEach((v,i)=>{
			if(!v.status)
				if(v.to_user == req.user.id)
					v.isReqReceived = 1
				else if(v.from_user == req.user.id)
					v.isReqSent = 1

			postData.search.some((f,j)=>{
				if(v.phone== f.mobile){
					postData.search.splice(j,1)
					return true
				 }
			})
		})
		console.log(friends);
		//	removing searched from postData
		// results =	postData.search.map(v=>{
		// 	var m = friends.find(f=>{
		// 		if(v.phone== f.mobile) return true
		// 	})
		// 	if(m) return m
		// 	else return v
		// })

		res.status(200).json({
			type:true,
			data:[...friends, ...postData.search],
			message:"friends found"
		})

	})
}


exports.FriendsList = function(req, res, next) {
	console.log("FriendsList called");

	var sql =	POOL.prepareStmt(`
			select users.id from friends inner join users on users.id =  CASE friends.to_user WHEN :user_id THEN friends.from_user ELSE friends.to_user END where (friends.to_user=:user_id or friends.from_user=:user_id) and friends.status=1`
			,{user_id:req.user.id})

		console.log(sql);

	POOL.query(sql, (err, friends)=>{
		if(err) return next(err)

		friends =	friends.map(v=>{ return v.id })
		if(!friends.length) friends = ['must-not-match']
		console.log(`friends`, friends);

		var sql = POOL.prepareStmt(
			`select  users.id, users.name,users.picture, (SELECT count(distinct f1.id ) FROM friends as f1 WHERE (f1.to_user in (:friends) and f1.from_user = users.id) or (f1.to_user = users.id and f1.from_user in (:friends) ) ) as mutual_friends  from users where users.id in (:friends)`
			,{friends:friends})
		console.log(sql);

		POOL.query(sql, (err,results)=>{
			if(err) return next(err)

			var sql = POOL.prepareStmt(
				`select count(*)
				from friends as f1
				inner join users on users.id =  CASE f1.to_user WHEN :user_id THEN f1.from_user ELSE f1.to_user END
				where f1.status=0 and (f1.to_user=:user_id or f1.from_user=:user_id)`
				,{user_id:req.user.id})
				console.log(sql);

			POOL.query(sql, (err,pending_requests)=>{
				if(err) return next(err)
				return res.status(200).json({
					type:true,
					data:results,
					pending_requests: pending_requests.length,
					message:"FriendList found"
				})
			})
		})
	})

}


exports.updateNotifSetting = function(req, res, next) {
	console.log(req.body)		
	 try {
			var notif = JSON.stringify(req.body)
		} catch (e) {
			return next(e)
		}

	var sql = POOL.prepareStmt(`update users set notif = :notif where id = :user_id`,{
		notif : notif,
		user_id: req.user.id
	})
	console.log(sql)
	POOL.query(sql, (err, done)=>{
		if(err) return next(err);

		res.status(200).json({
			type:true,
			data:req.body,
			message: "settings updated Successfully "
		});

	})
}
exports.socialLogin = function(req, res, next) {
	var postData = req.body
	console.error("socialLogin called", postData);

	FX.getUser(postData, (err, userData)=>{
		if(err) return next(err)
		// console.log(userData);
		if(userData) {
				//update and login
			userData = new UserInfo(userData);
			userData.addNotif();
			userData.addTokens();
			userData.firsttime = 0
			userData.picture = postData.picture
 			userData.device_token = postData.device_token;
			var sql =
			POOL.prepareStmt(`update users set device_token = :device_token, access_token = :access_token, picture = :picture where id = :user_id`,userData)

			POOL.query(sql, (err, done)=>{
				if(err) return next(err);

				return res.status(200).json({
					type:true,
					data:userData,
					message: DM.login_successfully
				});

			})
		}
		else{
			FX.sendMail("signup", 'Registration Successful', postData.email, postData, (err,status)=>{
				if(err) return next(err);

				postData.access_token  = FX.crypto(postData.facebook_id.toString() + new Date().getTime(), 'encrypt').toString();
				postData.lat =parseFloat(postData.lat)
				postData.lng =parseFloat(postData.lng)
				require('request')
				(`http://ws.geonames.org/countryCode?lat=${postData.lat}&lng=${postData.lng}&username=shivshankar&formatted=true`, (error, response, countryCode)=> {
					console.log("countryCode",countryCode)

					data = {
						country: countryCode.toLowerCase().slice(0,2),
						email: postData.email,
						name: postData.name,
						picture: postData.picture,
						facebook_id: postData.facebook_id,
						device_token: postData.device_token
					}

					POOL.query("insert into users set ?",data,(err, saved)=>{
					if(err) return  next(err);

					FX.getUser(postData, (err, userData)=>{
						if(err) return next(err)
						console.log(userData);
						userData = new UserInfo(userData);
						userData.addNotif();
						userData.addTokens();
						userData.firsttime =1
						return res.status(200).json({
							type:true,
							data:userData,
							message: DM.login_successfully
						});
							// return exports.socialLogin(req,res, next)
					})
				})
					})
			})
		}
	})
}



console.log(FX.crypto("19", "encrypt"))


exports.trophyCabinate = function(req, res, next) {
	var sql = POOL.prepareStmt('SELECT *  FROM user_trophies inner join  trophies on user_trophies.trophy_id = trophies.id and user_trophies.user_id = :user_id;', 
	{
		user_id: req.params.user_id
	})
	console.log(sql)
	POOL.query(sql, (err, results)=>{
		if(err) return next(err)

		 
			res.status(200).json({
				type:true,
				data:results,
				message:"trophies found"
			})
	})
}


exports.myTrophies = function(req, res, next) {
	var myxp = req.user.xp
	var newLevel = req.user.level
	var nextLevelXP = levelXP[newLevel]
	var nextLevel = newLevel+1
	var sql = POOL.prepareStmt(`			
		SELECT *,trophies.id as trophy_id , (CASE acquired when 1 then 1 ELSE IFNULL(acquired, 2) END) as acquired, ${myxp} as myxp, ${newLevel} as level, ${nextLevel} as nextLevel, ${nextLevelXP} as nextLevelXP FROM trophies left join  user_trophies on user_trophies.trophy_id = trophies.id and user_trophies.user_id = :user_id`, 
		{user_id: req.user.id})
	console.log(sql)
	POOL.query(sql, function(err, trophies) {
		if(err) return  next(err);
		var c =0 
		trophies.forEach(v=>{
			if(v.acquired==1) c+=1
		})
		return res.status(200).json({
			type:true,
			data: trophies,
			message: `${c}/${trophies.length} trophies unlocked`
		})

	})

}

exports.logoutUser = function(req, res, next) {

		console.log("logoutUser called");

	POOL.query("update users set device_token = '' where id = ?", [req.user.id], function(err, user) {
		if(err) return  next(err);

		return res.status(200).json({
			type:true,
			message: DM.logout_msg
		})

	})

}
