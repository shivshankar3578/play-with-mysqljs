const { users,
	missions,
	waitingQueue } = require('./shared');

const {UserInfo,UserShortInfo,  MissionInfo} =require('../app/functions/classes');
const h2hGame = require('./h2hGame');
/**
 * invitation stauts
 * new = 0
 * accept = 1
 * reject = 2
 * timeout = 3
 * cancel = 4
 */
exports.send = function(data, ack){
	const player = this;
	var client=  users[data.to_user]
	if(client && client.invitations[player.user.id])
		return ack({
			status:203,
			message: "Invitation already sent"
		})
	//	get all unseen missions
	POOL.query(`select * from missions where (player_id =? and player_has_seen=0 ) or (opponent_id=? and opponent_has_seen=0)`, [player.user.id,player.user.id],(err, results)=>{
		if(err) return player.emit("error", err)

	//	play unseen games should less then 6
	if(results.length >5)
		return ack({
			status:203,
			message: "player Room is full (max 6 games)"
		})

	//	NOTE running game always unseen
	// so filter running games
	results = results.filter(v=>{ if(v.status==0) return true })
	// console.log(results);

	if(results.some(
		(v)=>{
			if(v.opponent_id == data.to_user || v.player_id == data.to_user ) return true
		}))
		return ack({
			status:203,
			message:"already have running game with same opponent"
		})

	POOL.query(`select * from missions where (player_id =? and player_has_seen=0 ) or (opponent_id=? and opponent_has_seen=0)`, [data.to_user,data.to_user],(err, results)=>{
		//	play unseen games should less then 6
		if(results.length >5)
			return ack({
				status:203,
				message: "opponent Room is full (max 6 games)"
			})

			var msg = {
				from_user: new UserShortInfo(player.user),
				to_user: data.to_user,
				status:0,
				message:"new invitation ",
				created_at:new Date(),
			}
			ack({
				status:200,
				data:msg,
				message: "invitation sent",
				current_server_time: moment().unix()
			})

			// NOTE same as client declear in invitationTimeout && cancelInvitation
			var client = users[data.to_user]
			if(!client) return
			client.emit("getInvitation", msg)
			//	only client can stop timeout when any activity accept/reject
			// so here we are saving timeout on client's player
			client.invitations[player.user.id] =
				setTimeout(invitationTimeout.bind({msg:msg}), 10000);
		})
	})
}

function invitationTimeout(){
	console.log(`	*** invitationTimeout calling ***`, this.msg);
	var msg =this.msg
	var client = users[msg.to_user]
	var player_id = msg.from_user.user_id
	const player  = users[player_id]
	msg.status = 3
	msg.message = "invitation timeout";

	if(client){
		clearTimeout(client.invitations[player_id])
		delete client.invitations[player_id]
		client.emit("getInvitation", msg)
	}
	if(player)
		player.emit("getInvitation", msg)
}

exports.accept = function(data, ack){
	//	get all unseen missions
	const player = this
	POOL.query(`select * from missions where (player_id =? and player_has_seen=0 ) or (opponent_id=? and opponent_has_seen=0)`, [player.user.id,player.user.id],(err, results)=>{
		if(err) return player.emit("error", err)

	//	play unseen games should less then 6
	if(results.length >5)
		return ack({
			status:203,
			message: "player Room is full (max 6 games)"
		})

	//	NOTE running game always unseen
	// so filter running games
	results = results.filter(v=>{ if(v.status==0) return true })
	// console.log(results);

	if(results.some(
		(v)=>{
			if(v.opponent_id == data.to_user || v.player_id == data.to_user ) return true
		}))
		return ack({
			status:203,
			message:"already have running game with same opponent"
		})

	POOL.query(`select * from missions where (player_id =? and player_has_seen=0 ) or (opponent_id=? and opponent_has_seen=0)`, [data.to_user,data.to_user],(err, results)=>{
		//	play unseen games should less then 6
		if(results.length >5)
			return ack({
				status:203,
				message: "opponent Room is full (max 6 games)"
			})
			const player = this;
			console.log(`before clearTimeout`,player.invitations );
			clearTimeout(player.invitations[data.to_user])
			delete player.invitations[data.to_user]
			data.user_id = player.user.id
			data.opponent_id = data.to_user
			ack({
				status:200,
				message:"missions created"
			})
			h2hGame(data);

		})
	})
}
//player instanceof io.Manager


exports.cancel = function(data, ack){
	const player = this;
	var msg = {
		from_user: new UserShortInfo(player.user),
		to_user: data.to_user,
		created_at:new Date(),
		message:"invitation cancelled",
		status: 4
	}

	if(typeof ack == 'function')
		ack({
			status:200,
			data:msg,
			message: "invitation cancelled",
		})

	var client = users[data.to_user]
	if(!client) return
	console.log(`before clearTimeout`,client.invitations );
	clearTimeout(client.invitations[player.user.id])
	client.emit("getInvitation", msg)
	delete client.invitations[player.user.id]

}



exports.reject = function(data, ack){
	const player = this;
	var msg = {
		from_user: new UserShortInfo(player.user),
		to_user: data.to_user,
		created_at:new Date(),
		message:"invitation rejected",
		status: 2
	}

	console.log(`before clearTimeout`,player.invitations );
	clearTimeout(player.invitations[data.to_user])
	delete player.invitations[data.to_user]
	if(typeof ack == 'function')
		ack({
			status:200,
			data:msg,
			message: "invitation rejected",
		})

	var client = users[data.to_user]
	if(client)
		client.emit("getInvitation", msg)
}
