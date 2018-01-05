const { users,
	missions,
	waitingQueue } = require('./shared');

const {UserInfo, MissionInfo} =require('../app/functions/classes');

module.exports = function(data, ack){
	const socket = this
	var player = socket;
	console.info("start_game listing", data, missions[data.mission_id]);
	var mission = missions[data.mission_id]
	if(!mission)
		return ack({status:204, message: "mission expired" });

	var crop_image = process.env.AWS_IMAGE_BASE + data.crop_image
	var picture = process.env.AWS_IMAGE_BASE + data.picture

	console.log(`crop_image ${crop_image}`);

	CLARIFAI.models.predict(Clarifai.GENERAL_MODEL, crop_image, {video: false}).then((clari)=>{
		var clariTags = []
		try {
			clariTags = clari.outputs[0].data.concepts
		} catch (e) {
			console.log("clariTags not found");
			return player.emit("error", err)
		}
		// clariTags = [{name:"cat"},{name:"keywords"},{name:"google"}]
		// console.log(JSON.stringify(clariTags));

		var matchRule =
		mission.keywords.split(',')
		.some((v)=>{
			if(clariTags.some((w)=>{
				if(v == w ) return w.name
			})) return v.name
		})
		// console.log("clariTags",JSON.stringify(clariTags));
		// console.log("mission",JSON.stringify(mission));
		if(clariTags.some((v)=>{
			if(v.name == mission.name) return true
		}))	return gameWon();
		else if(matchRule)
			return gameWon()
		else
		{
			console.warn("image not match");
			// ack({status:200, message:"request accepted"})
			if(clariTags.some((v)=>{
				if(v.name == "motion" || v.name =="blur" ) return true;
			}))
				return ack({status:203, message: "Take a steadier photo" });

			if(clariTags.some((v)=>{
				if(v.name == "dark") return true;
			}))
				return ack({status:203, message: "Take photo with better lighting." });

			return ack({status:203, message: "Image not match. Please try again" });
		}
		//	write else

	 function gameWon(){

		DB.beginTransaction(function(err) {

			if(err)  return player.emit("error", err)
			var clari = {
				picture:  picture,
				crop_image: crop_image,
				mission_id : data.mission_id,
				click_by: player.user.id,
				game_id : mission.game_id,
				// matched : 1
			}

			POOL.query('INSERT INTO clarify_results SET ?', clari, (err, d) =>{
				if(err) return player.emit("error", err)
				var win_time  =  moment().unix() - mission.created_at;
				POOL.query('update missions SET winner = ?,win_time = ?, picture_id = ?, status=1 where id = ?',[player.user.id, win_time, d.insertId, data.mission_id], (err, results)=> {

					if(err) return player.emit("error", err)
					 DB.commit(function(err) {

						if(err) return player.emit("error", err)

						console.info("game won mission_id", mission.mission_id)

						ack({
							status:200,
							message:"you won"
						})

						if(!mission._timeout.cleared)
							mission._timeout.clear()

					 	mission.status = 1
						mission.crop_image = crop_image
						mission.win_picture = picture
			 			mission.mission_result = 'lost';

						if(mission.player_id == player.user.id)
							 oidx = mission.opponent_id;
						else
							 oidx = mission.player_id;

						var opponent = users[oidx]
						// console.log(`$$$$ opponent $$$$`, opponent);

						if(!opponent.is_bot)
				 			opponent.emit("game_results",{
				 				status:200,
								current_server_time: moment().unix(),
				 				data: [new MissionInfo(player.user, mission)],
				 				message:`sorry ${player.user.name} won`
				 			})

			 			mission.mission_result = 'won';
			 			player.emit('game_results',{
			 				status:200,
							current_server_time: moment().unix(),
			 				data: [new MissionInfo(opponent.user, mission)],
			 				message: `Congratulations! You won the game`
			 			});

			 			//	remove mission form array

					});
				});
			});
		});
	}
	// clari comment
	})
	.catch((err)=>{
		return player.emit("error", err)
	});
		//end
}
