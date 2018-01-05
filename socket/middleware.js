const { users,
	missions,
	waitingQueue } = require('./shared');

const {UserInfo, MissionInfo} =require('../app/functions/classes');

module.exports = function(socket, next) {
		// console.log(next.toString());
	console.log("middleware:",socket.handshake.query);

	var ssid = socket.handshake.query.ssid;
	if(!ssid)
		return  next(new Error("pls send ssid"));

	try{
		var user_id = FX.crypto(ssid.toString(), 'decrypt');
	}catch(e){
		return next(new Error("wrong ssid"))
	}

	FX.getUser({user_id:user_id}, (err, user)=>{
		if(err) return next(err)

		if(!user)
			return next(new Error("Invalid user"))

		if(socket.handshake.query.access_token != user.access_token)
			return next(new Error("Already login to other device"))
		user.online =1
		user = new UserInfo(user);

		if(users[user.id]){
			console.warn("duplicate socket disconnected", user.id);
			users[user.id].disconnect()
		}

		var sql =	POOL.prepareStmt(`
		select users.id, users.name from friends inner join users on users.id =  CASE friends.to_user WHEN :user_id THEN friends.from_user ELSE friends.to_user END where (friends.to_user=:user_id or friends.from_user=:user_id) and friends.status=1`
		,{ user_id:user.id })
		console.log(sql);

		POOL.query(sql, (err, friends)=>{
			if(err) return socket.emit("error", err)
			user.friends = friends
			user._waiting = { clear: ()=>{} , cleared: true}
			socket.user = user
			socket.invitations =  {}
			users[user.id] = socket
			console.info(`${socket.user.name} is connected`);
			next();
		})
	})
}
