var url = require("url");
exports.MissionInfo =  class {
	constructor(opponent, mission) {
		this.mission_id = mission.mission_id;
		this.created_at = mission.created_at;
		this.opponent_name = opponent.name;
		this.opponent_picture = opponent.picture;
		this.opponent_level = opponent.level;
		this.country_flag = opponent.country_flag;
		this.opponent_id = opponent.user_id;
		this.game_name = mission.name;
		this.game_picture = mission.picture;
		this.game_timeout = mission.timeout;
		this.status = mission.status;
		this.mission_result = mission.mission_result;
		this.win_picture = mission.win_picture;
		this.crop_image = mission.crop_image;
		this.is_friend = mission.is_friend ?  mission.is_friend : 0
		this.is_bot = mission.is_bot ? mission.is_bot : 0
		this._timeout = { clear: ()=>{}, cleared:true }
		this._waitingMsg = { clear: ()=>{}, cleared:true }
	}
}

exports.UserShortInfo =  class {
	constructor(data) {
		this.user_id = data.id ? data.id :data.user_id
		this.name = data.name
		this.picture = data.picture
		this.online = data.online? 1 : 0,
		this.mission = data.mission ? data.mission : {}
	}
}


exports.UserInfo =  class {
	constructor(data) {
		this.user_id = data.id;
		this.id = data.id;
		this.name = data.name;
		this.email =  data.email;
		this.notif =  data.notif;
		this.picture =  data.picture;
		this.bio =  data.bio ? data.bio : "";
		// this.picture = IMAGE_BASE+'users/'+data.picture
		this.facebook_id =  data.facebook_id;
		this.access_token =  data.access_token;
		this.country_name =  data.country_name;

		if(data.country_flag)
			this.country_flag = data.country_flag
		else if (data.flag)
			this.country_flag  = BASE_URL+'flags/64x64/'+data.flag+'.png'
		else if (data.country)
			this.country_flag  = BASE_URL+'flags/64x64/'+data.country+'.png'
		else
			this.country_flag = ''

		this.is_mobile_verified = data.is_mobile_verified ? 1 : 0
		this.online = data.online? 1: 0;
		this.level = data.level;
		this.xp = data.xp
		this.nextLevelXP =  levelXP[this.level]
		this.nextLevel =  this.level+1
		this._waiting = { clear: ()=>{}, cleared: true }
		this.device_token = data.device_token
	}
	addTokens(){
		 this.ssid = FX.crypto(this.user_id.toString(), 'encrypt').toString();
		 this.access_token =	FX.crypto(this.facebook_id.toString()+ new Date().getTime(), 'encrypt').toString();
	}
	addNotif(data){
		 try {
			this.notif = JSON.parse(this.notif)
		} catch (e) {
			console.log("json parse fail");
			this.notif = {
				"notif_tone":0,
				"notif_vibrate": 0,
				"profanity":1,
				"pn_msg":1, //
				"pn_end_game":1, // mission id
				"pn_invitation":0, // sender detail
				"pn_abs":1,
				"pn_new_friend_request":0, // sender
				"pn_accept_friend_request":0 //sender 
			}
		}
	}
}
