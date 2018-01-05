const { users,
	missions,
	waitingQueue,
	waitingQueueTimeout,
	missionTimeout,
	serverErr } = require('./shared');

const { UserInfo,
	MissionInfo } =require('../app/functions/classes');

const events = require('events');
const util = require('util');


class PrepareGame extends events {
	constructor(socket) {
		super();
		this.user = socket.user
		var self = this

		self.on("draftInvitation", (data) => {
			self.newInvitation = {
				from_user: self.user.id,
				to_user: data.to_user,
				message:data.message,
				created_at:moment().unix(),
			}
		});

		self.on("toSocket", (eventName, clientId, data) => {
			console.log(` ===>>>> sending to listener ${eventName}`, clientId);
			var client  = users[clientId]
			if(client)
				client.emit(eventName, data)
		});

	}

	// public function
	sendInvitation(data, ack) {
		// console.log(this);
		var self = this
		data.message = 'New Invitation'
		self.emit("draftInvitation", data)
		self.emit("toSocket", "getInvitation", data.to_user, self.newInvitation)

		setTimeout(()=>{
			data.message = 'Invitation timeout'
			self.emit("draftInvitation", data)
			self.emit("toSocket", "getInvitation", self.user.id, self.newInvitation)
		}, 15000)

		if(typeof ack == 'function')
			ack({
				status:200,
				message: "invitation sent",
			})
	}


	acceptInvitation(data, ack) {
		var self = this
		data.message = 'Invitation accepted'
		self.emit("draftInvitation", data)
		self.emit("toSocket", "getInvitation", data.to_user, self.newInvitation)

		if(typeof ack == 'function')
			ack({
				status:200,
				message: "invitation accepted",
			})
	}

	rejectInvitation(data, ack) {
		data.message = 'Invitation rejected'
		self.emit("draftInvitation", data)
		self.emit("toSocket", "getInvitation", data.to_user, self.newInvitation)

		if(typeof ack == 'function')
			ack({
				status:200,
				message: "invitation rejected",
			})
	}

}

util.inherits(PrepareGame, events.EventEmitter )

module.exports =  PrepareGame
