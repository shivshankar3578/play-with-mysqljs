const events = require('events');
const util = require('util');


class Player extends events {
	constructor(user_id) {
		super();
		var self = this
		self.on("GetAuthenticate", (user_id) => {
			var sql = "select users.*, countries.alpha_2 as flag, countries.name as country_name from users left join countries on users.country =countries.alpha_2 where users.email = ? or users.mobile = ? or users.facebook_id = ? or users.id = ?"
			POOL.query(sql, [p.email, p.mobile, p.facebook_id, p.user_id])
				.on("result", ()=>{

				})

		});

		self.on("GetActiveGames", (user_id) => {

		});

		self.on("GetFriends", (user_id) => {

		});

	}

	// public function
	getStarted(ssid){
		self.emit("GetAuthenticate", user_id);
		self.emit("GetActiveGames", user_id);
		self.emit("GetFriends", user_id);
	}
}

util.inherits(Player, events.EventEmitter )

module.exports =  Player
