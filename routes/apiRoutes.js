var express = require('express');
var router = express.Router();
var ctrl = {},
    ctrl_path = process.cwd() + '/app/controllers'
		// console.log(__dirname);
fs.readdirSync(ctrl_path).forEach(function(file) {
    if(file.indexOf('.js') != -1) {
        ctrl[file.split('.')[0]] = require(ctrl_path + '/' + file)
    }
})


		//	user routes
router.post("/socialLogin", ctrl.user.socialLogin)
router.get("/countryList", ctrl.user.countryList)

router.post("/updateNotifSetting",auth, ctrl.user.updateNotifSetting)
router.post("/sendOtp",auth, ctrl.user.sendOtp)
router.post("/verifyMobile",auth, ctrl.user.verifyMobile)
router.post("/editProfile", auth, ctrl.user.editProfile)
router.get("/viewProfile/:user_id", auth, ctrl.user.viewProfile)

router.post("/searchByFB", auth, ctrl.user.searchByFB)
router.post("/searchByMobile", auth, ctrl.user.searchByMobile)
router.get("/logoutUser", auth, ctrl.user.logoutUser)
router.post("/invitation/send", auth, ctrl.user.sendInvitation)
router.get("/invitation/accept/:invitation_id", auth, ctrl.user.acceptInvitation)
router.get("/invitation/decline/:invitation_id", auth, ctrl.user.declineInvitation)

	//	friend requests
router.post("/friend_req/send", auth, ctrl.user.sendFriendReq)
router.get("/friend_req/accept/:friend_req_id", auth, ctrl.user.acceptFriendReq)
router.get("/friend_req/unfriend/:friend_req_id", auth, ctrl.user.unfriend)
router.get("/friend_req/decline/:friend_req_id", auth, ctrl.user.declineFriendReq)
router.get("/friend_requests", auth, ctrl.user.FriendReqList)
router.get("/my_friends", auth, ctrl.user.FriendsList)
router.get("/my_trophies", auth, ctrl.user.myTrophies)
router.get("/trophy_cabinate/:user_id", auth, ctrl.user.trophyCabinate)
router.get("/acquireTrophy/:trophy_id", auth, ctrl.game.acquireTrophy)
router.post("/app_feedback", auth, ctrl.user.appFeedback)
router.get("/leaderboard/topPlayers/:id", auth, ctrl.game.leaderboard)
router.get("/leaderboard/friends/:id", auth,ctrl.game.friends, ctrl.game.leaderboard)
router.get("/checkMissionStatus/:mission_id", auth, ctrl.game.checkMissionStatus)

		//	game routes
router.get("/viewMission/:mission_id", auth, ctrl.game.viewMission)

module.exports = router;

function auth(req, res, next) {

	// console.log("auth stage called",req.headers);
	var ssid = req.headers.ssid;

	if(!ssid)
		return  next(new Error("pls provide ssid"));

	try{
		var user_id = FX.crypto(ssid.toString(), 'decrypt');
	}catch(e){
		return next(new Error("wrong ssid"))
	}

	console.log("user_id", user_id);
	FX.getUser({user_id:user_id}, (err, userData)=>{
		if(err) return next(err)

		if(!userData)
			return next(new Error("Invalid user"))

		// if(req.headers.access_token != userData.access_token)
		// 	return next(new Error("Invalid access token"))
		req.user = userData
		next()
	})

}
