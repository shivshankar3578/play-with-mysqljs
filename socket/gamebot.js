const { users,
	missions,
	waitingQueue } = require('./shared');

const {UserInfo, MissionInfo} =require('../app/functions/classes');

module.exports = function(user_id){
	//	ack Already sent
	const player = users[user_id]
	if(typeof player != 'object' ) return

	console.info(`gamebot listing
		socket :${player.id}
		waitingQueue: ${waitingQueue}
		user : ${player.user.name} ${player.user.id}`);


	POOL.query("select users.*, 1 as online, countries.alpha_2 as flag, countries.name as country_name from users left join countries on users.country =countries.alpha_2  where is_bot=1 order by rand() limit 1", (err, bot)=>{
		if(err) return player.emit("error", err)

		let opponent = {
			id:bot[0].id,
			user:new UserInfo(bot[0]),
			is_bot:1
		}

		users[opponent.id] = opponent
		console.info("found opponent: ", opponent.user.name);

		idx =	waitingQueue.indexOf(player.user.id);
		if(idx>=0)
			waitingQueue.splice( idx, 1 );

		if(!player.user._waiting.cleared)
			player.user._waiting.clear()

		POOL.query("select id, name, picture,keywords, timeout from games order by rand() limit 1 ", (err, result)=>{
			if(err) return player.emit("error", err)

			game = result[0]
			var m = {
				game_id:game.id,
				opponent_id:opponent.user.id,
				player_id:player.user.id,
				created_at: new Date(),
				is_bot:1,
				is_friend:0
			}

			POOL.query("insert into missions set ?", m, (err, saved, row)=>{
				if(err)  return player.emit("error", err)
				var mission_id = saved.insertId
				game.mission_id = mission_id
				m.created_at = moment(m.created_at).unix()
				m._waitingMsg = { clear: ()=>{}, cleared: true }
				var mission =
					Object.assign(game, m)

				missions[mission_id] = mission
				console.log(`max timeout ${game.timeout} sec.`);

				//	info to users
				player.emit('search_game',{
					status:200,
					current_server_time: moment().unix(),
					data: {opponent:opponent.user, game: game}
				});

				// var randTime = 	(Math.floor(Math.random() * (7 - 3)) + 3)*1000;
				mission.botGreeted =
					new Timeout(()=>{
						msg  ={
							from_user: opponent.user.id,
							to_user: player.user.id,
							message: "@$1$",
							is_bot:1,
							mission_id:mission_id,
							created_at: new Date()
						}
						POOL.query(`insert into messages set ?`,msg, (err, result)=>{
							console.log(err);
							msg.mission = new MissionInfo(opponent.user, mission)
							msg.created_at = moment(msg.created_at).unix()

							player.emit("newMessage", msg)

							missions[mission_id].botGreeted = 1
						})
					}, 7000);

				mission.botClosed =
					new Timeout(()=>{
						msg  ={
							from_user: opponent.user.id,
							to_user: player.user.id,
							message: "@$24$",
							is_bot:1,
							mission_id: mission_id,
							created_at: new Date()
						}
						POOL.query(`insert into messages set ?`,msg, (err, result)=>{
							console.log(err);
							msg.mission = new MissionInfo(opponent.user, mission)
							msg.created_at = moment(msg.created_at).unix()
							player.emit("newMessage", msg)
						})
						delete mission.botClosed
					}, game.timeout*1000 - 10000);

				mission._timeout = new Timeout(() => {
					console.warn("@@ timeout calling @@", mission);
						POOL.query("update missions set status =1 where id=?", mission.mission_id, (err, done)=>{
							if(err) return player.emit("error", err)

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
							delete missions[mission.mission_id];
						})
					}, game.timeout*1000);

				})
			})
		})

}
