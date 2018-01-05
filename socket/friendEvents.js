const { users,
	missions,
	waitingQueue } = require('./shared');

const {UserInfo, MissionInfo} =require('../app/functions/classes');

exports.sendFriendReq = function(data, ack) {

	var sql = POOL.prepareStmt(
		`select * from friends where (from_user = :from_user and to_user = :to_user) or (from_user = :to_user and to_user =:from_user) `,
		{
			from_user : socket.user.id,
			to_user : data.to_user
		})
		// console.log(sql);

	POOL.query(sql, (err, result)=>{
		if(err) return next(err)

		if(result.length)
			return res.status(203).json({
				type:false,
				message:"Already invitated"
			})

		POOL.query("insert into friends set ?", postData, (err, result)=>{
			if(err) return next(err)

			if(typeof ack == 'function')
				ack({
					type:true,
					message:"FriendReq sent"
				})

		})

	})
}


exports.acceptFriendReq = function(data, ack) {

	var sql = POOL.prepareStmt(`
		update friends set status = 1, updated_by = :user_id
		where (from_user = :user_id and to_user = :client_id) or ( from_user=:client_id and to_user=:user_id)`
		,{
			user_id:socket.user.id,
			client_id:data.user_id
		})
	// console.log(sql);
	POOL.query(sql, (err,done)=>{
		if(err) return next(err)

		if(typeof ack == 'function')
			ack({
				type:true,
				message:"FriendReq accepted"
			})

	})

}

exports.declineFriendReq = function(data, ack){
	var sql = mysql.format(`
		update friends set status = -1, updated_by =? where id = ? `,
		[socket.user.id, data.user_id ])

	// console.log(sql);

	POOL.query(sql, (err,done)=>{
		if(err) return next(err)

		if(typeof ack == 'function')
			ack({
				type:true,
				message:"FriendReq declined"
			})
	})

}


exports.friendReqList = function(data, ack) {

	var sql = POOL.prepareStmt(
		`select users.name, users.id as user_id, f1.id as request_id, f1.status as request_status,users.picture as picture
		from friends as f1
		inner join users on users.id =  CASE f1.to_user WHEN :user_id THEN f1.from_user ELSE f1.to_user END
		where f1.status=0 and (f1.to_user=:user_id or f1.from_user=:user_id)`
		,{
			user_id:socket.user.id
		})
		// console.log(sql);
	POOL.query(sql, (err,results)=>{
		if(err) return next(err)

		if(typeof ack == 'function')
			ack({
				type:true,
				data:results,
				message:"FriendReqList found"
			})
	})
}
