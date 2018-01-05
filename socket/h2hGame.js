const { users,
	missions,
	waitingQueue  } = require('./shared');

const {UserInfo, MissionInfo} =require('../app/functions/classes');

module.exports = function(data){
	const player = users[data.user_id]
	if(typeof player != 'object' ) return

	console.info(`h2hGame listing
		player :${player.id}
		waitingQueue: ${waitingQueue}
		user : ${player.user.name} ${player.user.id}`);


		let opponent = users[data.opponent_id]
		console.info("found opponent: ", opponent.user.name);
		debugger;

	POOL.query("select id, name, picture,keywords, timeout from games order by rand() limit 1 ", (err, result)=>{
		if(err) return player.emit("error", err)

		game = result[0]
		var m = {
			game_id:game.id,
			opponent_id:opponent.user.id,
			player_id:player.user.id,
			created_at: new Date(),
			is_friend : 1,
			is_bot:0
		}

		POOL.query("insert into missions set ?", m, (err, saved, row)=>{
			if(err)  return player.emit("error", err)

			game.mission_id = saved.insertId
			m.created_at = moment(m.created_at).unix()
			m._waitingMsg = { clear: ()=>{}, cleared: true }
			var mission =
				Object.assign(game, m)

			missions[saved.insertId] = mission
			console.log(`max timeout ${game.timeout} sec.`);

			//	info to users
			player.emit('getInvitation',{
				status:1,
				message:"invitation accepted",
				current_server_time: moment().unix(),
				data: {opponent:opponent.user, game: game}
			});

			opponent.emit('getInvitation',{
				status:1,
				message:"invitation accepted",
				current_server_time: moment().unix(),
				data: {opponent:player.user, game: game}
			});

			mission._timeout = new Timeout(() => {
				console.warn("@@ timeout calling @@", mission);
				POOL.query("update missions set status =1 where id=?", mission.mission_id, (err, done)=>{
					console.error(err);
					if(err) return

					//	need to re evalue player & opponent
					mission.status = 1
					mission.win_picture = ""
		 			mission.mission_result = 'expired';

					player.emit('game_results',{
						status:200,
						current_server_time: moment().unix(),
						data: [new MissionInfo(opponent.user, mission)],
						message: "mission timeout"
					});

					opponent.emit('game_results',{
						status:200,
						current_server_time: moment().unix(),
						data: [new MissionInfo(player.user, mission)],
						message: "mission timeout"
					});

					delete missions[mission.mission_id];

				})
				}, game.timeout*1000);
		})
	})

}
