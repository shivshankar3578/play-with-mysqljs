const { users,
	missions,
	waitingQueue} = require('./shared');

const { UserInfo,
	UserShortInfo,
	MissionInfo
 } = require('../app/functions/classes');

const chatbot = require('./chatbot');

exports.isBackground = function(data, ack){
	const socket = this
	socket.user.online = !data.isBackground;

	socket.user.friends.forEach((v)=>{
		console.log(v);
		if(friend = users[v.id]){
			console.info(`tell ${friend.user.name} you ${socket.user.name} is ${socket.user.online}`);
			friend.emit("friendsStatus",  new UserShortInfo(socket.user))
		}
	})
	if(typeof ack == 'function')
		ack({
			status:200,
			message: "isBackground ok",
		})

}


looking4bot = function(msg) {
	//The maximum 22 is exclusive and the minimum 1 is inclusive
	var rand = Math.floor(Math.random() * (22 - 1)) + 1;
	return	(function loop(toast) {
			if(toast>5) return
			else if(!chatbot[msg]) return
			else if(chatbot[msg].exclude.some(v=>{
					if(v==`@$${rand}$`) return true
			}))  loop(++toast)
			else
				return rand
		})(0)
}

exports.friendsStatus = function(data, ack){
	const socket = this

	var sql =	POOL.prepareStmt(`
			select users.id as user_id,1 as is_friend, friends.status as request_status, friends.to_user, users.name, users.picture from friends inner join users on users.id =  CASE friends.to_user WHEN :user_id THEN friends.from_user ELSE friends.to_user END where friends.to_user=:user_id or friends.from_user=:user_id`
			,{user_id:socket.user.id})
	// console.log(sql);

	POOL.query(sql, (err, results)=>{
		if(err) return socket.emit("error", err)
		var pending_requests = 0
		var online  = []
	// update friends status
		results.forEach((user)=>{
			if(user.request_status==0 && user.to_user == socket.user.id){
				console.log("count++");
				++pending_requests
				return false
			}
			else if(user.request_status){
				var client = users[user.user_id]
				if(client && client.user && client.user.online){
					client.is_friend = 1
					online.push(client.user)
				}
			}

		})
		//	already send at connection time need improve

		// io.emit("friendsStatus", new UserShortInfo(socket.user))
		//	send friends status[] to me
		if(typeof ack == 'function')
			ack({
				status:200,
				pending_requests: pending_requests,
				message: "Friends found",
				data:online
			})
	})

}

exports.newMessage = function(data, ack){
	const socket = this
	console.log(`newMessage listing`,data);
	var msg = {
		from_user: socket.user.id,
		to_user: data.to_user,
		mission_id:data.mission_id? data.mission_id: 0,
		created_at:new Date(),
		message: data.message,
		is_friend: data.is_friend,
		is_bot: 0
	}
	var mission = missions[data.mission_id]
	if(!mission)
		// return ack({status:203, message: "Mission completed" })
		// dummy prototype of mission.
		mission = {_waitingMsg : { clear: ()=>{}, cleared: true }}

	POOL.query(`insert into messages set ?`,msg, (err, result)=>{
		if(err) return socket.emit("error", err)

		msg.id = result.insertId
		msg.created_at = moment(msg.created_at).unix()*1000;

		ack({
			status:200,
			message: "msg sent",
			data:msg
		})

		var client = users[data.to_user]
		if(typeof client != 'object' || client.isBackground==true) 
			return	FX.apnSend(data.to_user, 'pn_msg', `${socket.user.name} sent you a message`,  new MissionInfo(socket.user, mission))

		msg.mission  = new MissionInfo(socket.user, mission)

		if(!client.is_bot)
			return	client.emit('newMessage', msg);
		if(!mission._waitingMsg.cleared)
			mission._waitingMsg.clear()
		if(!mission.botClosed)
			if(!mission._waitingMsg.cleared)
				return mission._waitingMsg.clear()
			//	chat with bot
			mission._waitingMsg =	new Timeout(function () {
				var x = looking4bot(data.message)
				console.info(`*** botReply ***`,x);
				if(!x) x = 9
					var msg  = {
						from_user: client.user.id,
						to_user: socket.user.id,
						message: `@$${x}$`,
						mission_id:data.mission_id,
						is_bot: 1,
						is_friend: 0,
						created_at: new Date()
					}
					POOL.query(`insert into messages set ?`,msg, (err, result)=>{
						console.log(err);
						msg.mission = new MissionInfo(client.user, mission),
						msg.created_at = moment(msg.created_at).unix(),
						socket.emit("newMessage", msg)
					})
				},(Math.floor(Math.random() * (7 - 3)) + 3)*1000);


	});
}

exports.viewMessages = function(data, ack){
	const socket = this
	console.info(`viewMessages listing`, data);
	var mission = missions[data.mission_id]

	var sql = `select *,unix_timestamp(messages.created_at)*1000 as created_at from messages left join missions on missions.id= messages.mission_id where mission_id = case when missions.is_bot then :mission_id else mission_id end and  ((to_user=:user_id and from_user=:client_id) or (to_user=:client_id and from_user=:user_id)) `

	var sql = POOL.prepareStmt(sql,{
			user_id:socket.user.id,
			client_id:data.user_id,
			mission_id:data.mission_id
		})
 console.log(sql);

	POOL.query(sql, (err, messages)=>{
		if(err) return socket.emit("error", err)
		//	send friends messages[] to me

		var oppnent = users[data.user_id]

		return ack({
			status:200,
			data:messages,
			message: "messages found",
			online: (oppnent && oppnent.user.online) ? 1: 0
		})
	})

}

exports.chatAndPlayList = function(data, ack){
	const socket = this
	console.info(`chatAndPlayList listing`, data);
	var sql =	POOL.prepareStmt(
		`SELECT t.*,unix_timestamp(t.created_at)*1000 as created_at , users.name,1 as is_friend, users.picture, ifnull((select id from missions where ((player_id=:user_id and opponent_id=t.user_id) or (player_id=t.user_id and opponent_id =:user_id )) order by id desc limit 1 ), 0) as current_mission_id from users
		inner join
		( SELECT *, messages.message as lastmsg,
			CASE WHEN to_user = :user_id
			THEN (SELECT users.id FROM users where id = from_user)
			ELSE (SELECT users.id  FROM users where id = to_user)
			END user_id
		FROM messages
		WHERE messages.id
			IN (SELECT MAX(id) AS id FROM
				(SELECT id, from_user AS id_with FROM messages WHERE to_user =:user_id and from_user in (SELECT (CASE to_user WHEN :user_id THEN from_user ELSE to_user END) as id from friends where (to_user=:user_id or from_user=:user_id) and status=1)
					UNION ALL
				SELECT id, to_user AS id_with FROM messages WHERE from_user =:user_id  and to_user in (SELECT (CASE to_user WHEN :user_id THEN from_user ELSE to_user END) as id from friends where (to_user=:user_id or from_user=:user_id) and status=1)) t
		GROUP BY id_with)  LIMIT 0,50 ) as t
		on users.id = t.user_id GROUP by user_id order by id  desc`
	,{user_id:socket.user.id})

	console.log(sql);

	POOL.query(sql, (err, messages)=>{
		if(err) return socket.emit("error", err)
		return ack({
			status:200,
			data:messages,
			message: "messages found"
		})
	})

}

exports.startTyping = function(data, ack){
	const socket = this

}

exports.stopTyping = function(data, ack){
	const socket = this

}


exports.leaveChat = function(data, ack){
	const socket = this
	socket.user.online = 0;
	if(socket = users[socket.user._id])
		socket.user.followings.forEach((v)=>{
			if(friend = users[v._id]){
				console.log(`tell ${friend.name} you are leaving chat`);
				friend.emit("friendsStatus",[new UserInfo(socket.user)])
			}
		})
}
