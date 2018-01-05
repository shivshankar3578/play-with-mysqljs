const { users} = require('../../socket/shared');


exports.friends = function(req, res, next){
	var sql =	POOL.prepareStmt(`select users.id as user_id, users.xp, users.picture, users.level, users.name, m.mission_id, 
		concat('${IMAGE_BASE}', 'flags/64x64/', users.country, '.png') as country_flag,
		(count(*)-COUNT(CASE WHEN users.id = m.winner THEN 1 END) - COUNT(CASE WHEN m.winner =0 THEN 1 END) ) as lost, m.winner,count(*) as total, COUNT(CASE WHEN users.id = m.winner THEN 1 END) as won, COUNT(CASE WHEN m.winner =0 THEN 1 END)  as draw from users
		inner join ( select id as mission_id, player_id, winner  from missions  union all select id as mission_id, opponent_id,winner  from missions ) as m  on users.id =   m.player_id where users.id in (select users.id from friends inner join users on users.id =  CASE friends.to_user WHEN :user_id THEN friends.from_user ELSE friends.to_user END where (friends.to_user=:user_id or friends.from_user=:user_id) and friends.status=1) group by users.id order by users.xp desc`, {
			friends: req.friends,
			country: req.user.country,
			user_id: req.params.id?req.params.id: req.user.id
		})
	console.log(sql);
	POOL.query(sql, (err, result)=>{
		return res.status(200).json({
			type:true,
			data:result,
			message:"mission found"
		})
	})

}

exports.leaderboard = function(req, res, next){
	const socket = this
		var	where = ' ' 
	if(!req.query.isGlobe)
		where += ` and users.country= :country`
	var sql =	POOL.prepareStmt(`select users.id as user_id, users.xp, users.picture, users.level, users.name, m.mission_id, concat('${IMAGE_BASE}', 'flags/64x64/', users.country, '.png') as country_flag,
		(count(*)-COUNT(CASE WHEN users.id = m.winner THEN 1 END) - COUNT(CASE WHEN m.winner =0 THEN 1 END) ) as lost, m.winner,count(*) as total, COUNT(CASE WHEN users.id = m.winner THEN 1 END) as won, COUNT(CASE WHEN m.winner =0 THEN 1 END)  as draw from users
		inner join ( select id as mission_id, player_id, winner  from missions  union all select id as mission_id, opponent_id,winner  from missions ) as m  on users.id =   m.player_id where users.is_bot!=1 ${where} group by users.id order by users.xp desc`, {
			friends: req.friends,
			country: req.user.country
		})
	console.log(sql);
	POOL.query(sql, (err, result)=>{
		return res.status(200).json({
			type:true,
			data:result,
			message:"mission found"
		})
	})

}

exports.checkMissionStatus = function(req, res, next) {
	console.log("viewMission called",req.user.id	);
	POOL.query(`select missions.id as mission_id, unix_timestamp(missions.created_at) as created_at, opponent.name as opponent_name, opponent.id as opponent_id, 1 as level, missions.status, clarify_results.created_at  as click_time, clarify_results.picture as win_picture,
	opponent.picture AS opponent_picture,
	concat('${IMAGE_BASE}', 'flags/64x64/', opponent.country, '.png') as country_flag,
	games.name as game_name, games.picture as game_picture, games.timeout as game_timeout,
	CASE missions.winner WHEN ? THEN 'won' WHEN 0 THEN 'expired' ELSE 'lost' END  AS mission_result
	from missions
	left join clarify_results on clarify_results.mission_id = missions.id
	inner join games on games.id = missions.game_id
	inner join users as opponent on opponent.id = CASE missions.opponent_id WHEN ? THEN missions.player_id ELSE missions.opponent_id END
	where missions.id= ? `, [req.user.id,req.user.id,req.params.mission_id], (err, result)=>{
		if(err) return next(err)

		return res.status(200).json({
			type:true,
			data:result[0],
			message:"mission found"
		})
	})

}



exports.acquireTrophy = function(req, res, next) {

	POOL.query(`select * from trophies left join user_trophies on user_trophies.trophy_id = trophies.id and user_trophies.user_id = ? where trophies.id= ?`,[req.user.id, req.params.trophy_id], (err, t)=>{
		if(err) return next(err)

		if(t[0].acquired)
			return res.status(200).json({
				type:true,
				message:"trophy already acquired"
			})

		var newLevel = 1
		req.user.xp += t[0].xp
		levelXP.some((v,i)=>{
			if(v>parseInt(req.user.xp)){
				newLevel = i
				return true
			}
		})

		var sql =POOL.prepareStmt(
		`update user_trophies set acquired=1 where trophy_id = :trophy_id and user_id = :user_id;
		update users set level = :level, xp = :xp where id = :user_id`, 
		{
			trophy_id : req.params.trophy_id,
			user_id   : req.user.id,
			xp        : req.user.xp,
			level     : newLevel
		})
		console.log(sql);
		POOL.query(sql, (err, done)=>{
			if(err) return next(err)
			return res.status(200).json({
				type:true,
				message:"trophy acquired"
			})

		})
	})
}



exports.viewMission = function(req, res, next) {
	console.log("viewMission called",req.user.id	);
	var postData = {
		mission_id:req.params.mission_id,
		user_id:req.user.id
	}

		var sql =		POOL.prepareStmt(`
			SELECT missions.id as mission_id,missions.is_bot,  missions.is_friend, IF(friends.status IS NULL, 0, 1)  as is_req_sent, missions.status as status, missions.win_time, opponent.name as opponent_name, opponent.id as opponent_id, clarify_results.picture as win_picture, clarify_results.crop_image as crop_image, missions.status as status, opponent.picture  AS opponent_picture,
			concat('${IMAGE_BASE}', 'flags/64x64/', opponent.country, '.png') as country_flag,
			games.name as game_name, games.picture as game_picture, games.timeout as game_timeout,
			CASE missions.winner WHEN :user_id THEN 'won' WHEN 0 THEN 'expired' ELSE 'lost' END  AS mission_result,
			CASE missions.player_has_seen WHEN player_id=:user_id THEN missions.player_has_seen  ELSE missions.opponent_has_seen END  AS player_has_seen
			from missions
			inner join games on games.id = missions.game_id
			left join friends on from_user = :user_id and to_user = missions.opponent_id
			inner join users as opponent on opponent.id = CASE missions.opponent_id WHEN :user_id THEN missions.player_id ELSE missions.opponent_id END
			left join clarify_results on clarify_results.mission_id = missions.id 
			where missions.id = :mission_id; 

			SELECT *,trophies.id as trophy_id, user_trophies.trophy_id as acquired_trophy  FROM trophies left join  user_trophies on user_trophies.trophy_id = trophies.id and user_trophies.user_id = :user_id;

			SELECT count(*) as game_played, SUM(IF(winner = :user_id, 1, 0)) as game_won from missions where 
			CASE missions.player_id WHEN :user_id THEN player_id  ELSE opponent_id END = :user_id;

			UPDATE missions set
					player_has_seen = CASE WHEN player_id = :user_id THEN 1 ELSE player_has_seen END,
					opponent_has_seen = CASE WHEN opponent_id = :user_id THEN 1 ELSE opponent_has_seen END
					where missions.id = :mission_id
			`, postData)

			console.log(sql)

		POOL.query(sql, (err, result)=>{
			if(err) return next(err)
			var mission = result[0][0];
			var user_trophies = result[1];
			var game_played = result[2][0].game_played;
			var game_won = result[2][0].game_won;
			var winning_streak = req.user.winning_streak;
			if(mission.mission_result='won' && mission.player_has_seen==0)
				winning_streak+=1		
			var win_time = mission.win_time
			mission.win_time =  `${Math.floor(win_time/60)}m ${win_time%60}s`
			mission.trophy = []
			// won any game trohpy 
			// var	 mission_result =  mission.mission_result


			console.log('user records', game_played, game_won);
			var acquired = []
			user_trophies.forEach(v=>{
				// console.log(v.acquired);
				if(v.trophy_id == v.acquired_trophy) return false
				if(eval(`if(${v.hook}) true`)){
				  acquired.push([req.user.id, v.trophy_id ])
				  req.user.xp += v.xp;
					mission.trophy.push(v)
				} 
			})		
			console.log(acquired);

			var newLevel = 1
			levelXP.some((v,i)=>{
				if(v>parseInt(req.user.xp)){
					newLevel = i
					return true
				}
			})

			mission.user = {
				level : newLevel,
				xp : req.user.xp,
				nextLevelXP : levelXP[newLevel],
				nextLevel : newLevel+1,
			}
			console.log(`mission.player_has_seen`,mission.player_has_seen);
			if(acquired.length)
				POOL.query( `
					INSERT INTO user_trophies (user_id,trophy_id) VALUES ?;
					UPDATE users set winning_streak = 0 where id = ?;
					`, [acquired, req.user.id], (err, results)=>{
					if(err) return next(err)
					res.status(200).json({
						type:true,
						data:mission,
						message:"mission found"
					})
				})
				else if(mission.mission_result='won' && mission.player_has_seen==0)
					POOL.query( `UPDATE users set winning_streak = ? where id = ?;`, [winning_streak, req.user.id], (err, results)=>{
						if(err) return next(err)
						res.status(200).json({
							type:true,
							data:mission,
							message:"mission found"
						})
					})

				else
				 res.status(200).json({
						type:true,
						data:mission,
						message:"mission found"
					})
		})

}
