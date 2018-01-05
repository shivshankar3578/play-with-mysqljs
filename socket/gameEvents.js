const { users,
	missions,
	waitingQueue  } = require('./shared');

const {UserInfo,UserShortInfo, MissionInfo} =require('../app/functions/classes');

exports.cancel_search = function(data, ack){
	const socket = this

	idx =	waitingQueue.indexOf(socket.user.id);
	if(idx>=0)
		waitingQueue.splice( idx, 1 );

	if(!socket.user._waiting.cleared)
			socket.user._waiting.clear()


	ack({
		status:200,
		message:"search cancelled"
	})
}


exports.game_results = function(data, ack){
	const socket = this
	return ack({status:200, message:"game_results listing"})
}


exports.gamesWithPlayer = function(data, ack){
	const socket = this
	var sql =	POOL.prepareStmt(`
	select *, missions.id as mission_id, users.id as user_id from users
	left join missions on users.id =  CASE missions.player_id WHEN :user_id THEN missions.opponent_id ELSE missions.player_id END and ((missions.player_id=:opponent_id and missions.opponent_id=:user_id) or (missions.player_id=:user_id and missions.opponent_id=:opponent_id) ) and missions.status=0
	left join games on missions.game_id = games.id
	where users.id = :opponent_id limit 1`
	,{
		user_id:socket.user.id,
		opponent_id:data.opponent_id
	})
	console.log(sql);
	POOL.query({sql:sql, nestTables: true}, (err, result)=>{
		if(err) return socket.emit("error", err)
		// console.log(result);
		var result = result[0]
		if(result.missions){
			result.games.mission_id = result.missions.id
			result.games.created_at = moment(result.missions.created_at).unix()
			result.games.game_results = 'expired'
		}
		ack({
			status:200,
			message:"result found",
			data: {
				opponent:new UserInfo(result.users),
				game: result.missions.id ? result.games : {}
			}
		})
	})
}



exports.active_games = function(data, ack){
	const socket = this
	FX.GetActiveGames({user_id:socket.user.id}, (err, results)=>{
		if(err) return socket.emit("error", err)

		// socket.active_games = results;
		ack({
			status:200,
			current_server_time: moment().unix(),
			message:"active_games  request recived",
			data: results
		})
	})
}
