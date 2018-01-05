const app = require('../app');
const events = require('events');
const util = require('util');
const { users,
	missions,
	waitingQueue,
	waitingQueueTimeout,
	missionTimeout,
	serverErr } = require('./shared');

const {UserInfo, MissionInfo,UserShortInfo} =require('../app/functions/classes');
const chatEvents = require('./chatEvents');
const gameEvents = require('./gameEvents');
const h2hGame = require('./h2hGame');
const gamebot = require('./gamebot');
const invitation = require('./invitation');
const friendEvents = require('./friendEvents');
require('./restart_patches.js')

module.exports = function(io){

io.use(require('socketio-wildcard')());

io.use(require('./middleware'));

io.on('connection', (socket)=>{
	console.log("connection done", socket.id, socket.user.id);
	socket.user.online = 1
	// socket.broadcast.emit("friendsStatus", new UserShortInfo(socket.user))
	// var ioRoom = io.sockets.adapter.rooms;
	socket.user.friends.forEach((v)=>{
		console.log(v);
		if(friend = users[v.id]){
			console.info(`tell ${friend.user.name} you ${socket.user.name} is online`);
			friend.emit("friendsStatus",  new UserShortInfo(socket.user))
		}
	})
	socket.on("*", (packet)=>{
		// return socket.emit("error", new Error(serverErr));
		// packet.data ['event_name', 'postData', [func]]
		console.info(" ***** Event calling *****");
		console.dir({
			eventName :packet.data[0],
			postData : packet.data[1],
			waitingQueue: waitingQueue,
			socket: socket.id,
			user: socket.user._id
		});
	})

	//	bot events
	socket.on("gamebot", require('./gamebot') );

	//	friend events
	socket.on("sendFriendReq", friendEvents.sendFriendReq)
	// socket.on("friendsList", friendEvents.friendsList)
	socket.on("friendReqList", friendEvents.friendReqList)
	socket.on("acceptFriendReq", friendEvents.acceptFriendReq)
	socket.on("declineFriendReq", friendEvents.declineFriendReq)

	//	chat event
	socket.on("friendsStatus",chatEvents.friendsStatus );
	socket.on("viewMessages", chatEvents.viewMessages)
	socket.on("newMessage", chatEvents.newMessage)
	socket.on("chatAndPlayList", chatEvents.chatAndPlayList)
	socket.on("startTyping", chatEvents.startTyping)
	socket.on("stopTyping", chatEvents.stopTyping)
	socket.on("leaveChat", chatEvents.leaveChat)
	socket.on("isBackground", chatEvents.isBackground)
	socket.on("gamesWithPlayer",gameEvents.gamesWithPlayer );
	socket.on("cancel_search",gameEvents.cancel_search );
	socket.on("game_results",gameEvents.game_results )
	socket.on("active_games", gameEvents.active_games)
	socket.on("search_game", require('./search_game') );
	socket.on("start_game", require('./start_game') );

	//	invitation events
	socket.on("sendInvitation", invitation.send)
	socket.on("cancelInvitation", invitation.cancel)
	socket.on("acceptInvitation", invitation.accept)
	socket.on("rejectInvitation", invitation.reject)


	socket.on("disconnect", ()=>{
		console.log("socket disconnect");
		socket.user.online=0
 	// 	socket.broadcast.emit("friendsStatus", new UserShortInfo(socket.user))
		socket.user.friends.forEach((v)=>{
			console.log(v);
			if(friend = users[v.id]){
				console.log(`tell ${friend.user.name} you ${socket.user.name} is offline`);
				friend.emit("friendsStatus",  new UserShortInfo(socket.user))
			}
		})
		idx =	waitingQueue.indexOf(socket.user.id);
		if(idx>=0)  waitingQueue.splice( idx, 1 );
		socket.disconnect()
		delete users[socket.user.id]
	})

	socket.on("error", (err)=>{
		console.error("server err", err);
		socket.emit("stdErr", "Someting went wrong")
	})

});

}
