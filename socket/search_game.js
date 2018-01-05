const { users,
	missions,
	waitingQueue
	} = require('./shared');

const {UserInfo, MissionInfo} =require('../app/functions/classes');
const gamebot = require('./gamebot');

module.exports = function(postData, ack){
	const socket = this
	var player = socket;
	//	get all unseen missions
	POOL.query(`select * from missions where (player_id =? and player_has_seen=0 ) or (opponent_id=? and opponent_has_seen=0)`, [socket.user.id,socket.user.id],(err, results)=>{
		if(err) return player.emit("error", err)

	//	play unseen games should less then 6
	if(results.length >5)
		return ack({
			status:203,
			message: "Room is full (max 6 games)"
		})

	//	NOTE running game always unseen
	// so filter running games
	results = results.filter(v=>{ if(v.status==0) return true })
	console.log(results);

	var oidx =
		waitingQueue.find((m, i)=>{
			console.log("queue looping for sid",m);
			//	should not match with yourself and must in socket
			if(m == player.user.id || !users[m])
				return false
			var opponent = users[m]
			//	check whether have common running game
			if(results.some(v=>{
				if(v.opponent_id == opponent.user.id || v.player_id==opponent.user.id) return true
			}))
				return false
			return true
		})

		if(!oidx) return addSearchTimeout()



		var opponent = users[oidx]
		waitingQueue.splice(waitingQueue.indexOf(oidx), 1)
		if(!opponent.user._waiting.cleared)
				opponent.user._waiting.clear()

		console.info("found opponent: ", opponent.user.name);
		debugger;

		ack({
			status:200,
			message:"game found"
		})

	POOL.query("select id, name, picture,keywords, timeout from games order by rand() limit 1 ", (err, result)=>{
		if(err) return player.emit("error", err)

		game = result[0]
		var m = {
			game_id:game.id,
			opponent_id:opponent.user.id,
			player_id:player.user.id,
			created_at: new Date(),
			is_friend :0,
			is_bot:0
		}

		var sql = POOL.prepareStmt(`
			select id from friends where
			(from_user=:from_user and to_user=:to_user ) or (to_user=:from_user and from_user=:to_user ) and status =1 `
			,{
				from_user:socket.user.id,
				to_user: opponent.user.id
			})
			// console.log(sql);
		POOL.query(sql, (err, friends)=>{
			if(err)  return player.emit("error", err)

			console.log("friends stauts id",result );
			if(friends.length)
				m.is_friend = 1

		POOL.query("insert into missions set ?", m, (err, saved, row)=>{
			if(err)  return player.emit("error", err)

			game.mission_id = saved.insertId
			m.created_at = moment(m.created_at).unix()
			m._waitingMsg = { clear: ()=>{}, cleared: true }
			var mission =
				Object.assign(game, m)

			missions[saved.insertId] = mission
			console.log(`max timeout ${game.timeout} sec.`);


			var opponent = users[oidx]


			//	info to users
			opponent.emit('search_game',{
				status:200,
				current_server_time: moment().unix(),
				data: {opponent:player.user, game: game}
			});


			player.emit('search_game',{
				status:200,
				current_server_time: moment().unix(),
				data: {opponent:opponent.user, game: game}
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

						//	player scope change if socket reconnect
						var player = users[mission.player_id]
						var opponent = users[mission.opponent_id]
						if(!player ||  !player.online)
								FX.apnSend(mission.player_id, 'pn_end_game', "Game Finished", { 
									mission_id: mission.mission_id,
									opponent_id: mission.opponent_id
								})
						else
							player.emit('game_results',{
								status:200,
								current_server_time: moment().unix(),
								data: [new MissionInfo(opponent.user, mission)],
								message: "mission timeout"
							});

						if(!opponent ||  !opponent.online)
							FX.apnSend(mission.opponent_id, 'pn_end_game', "New Message",  { 
									mission_id: mission.mission_id,
									opponent_id: mission.opponent_id
								})
						else
							opponent.emit('game_results',{
								status:200,
								current_server_time: moment().unix(),
								data: [new MissionInfo(player.user, mission)],
								message: "mission timeout"
							});

					})
				}, game.timeout*1000);

			})
		})
	})
})
//POOL.query("select * from users where is_bot=1 limit 1")
// ()=>{
// 	console.info("timeout t1 called");
// 	player.emit('search_game',{status:203, message: "No game found. Please try again."});
// 	waitingQueue.splice(pidx-1,1)
// 	}
	function  addSearchTimeout() {
		console.info(`addSearchTimeout calling`, player.id);

		//	push to waitingQueue is not in queue
		var pidx = false
		if(waitingQueue.indexOf(player.user.id) < 0)
			pidx = 	waitingQueue.push(player.user.id);

		console.log("now queue", waitingQueue);
		ack({
			status:200,
			message: "Please wait, Search in progress"
		})

		 player.user._waiting =
			 new Timeout(()=>{
				 waitingQueue.splice(pidx-1,1)
				 gamebot(player.user.id)
			 }, 10000)

	}
}
