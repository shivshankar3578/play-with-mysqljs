const { users,
	missions,
	waitingQueue } = require('./shared');

console.info("restart patches called");
// hard reset prev. server restart/crash fixes
POOL.query("update missions inner join games on games.id = missions.game_id set missions.status=1 WHERE UNIX_TIMESTAMP( NOW( ) ) > ( UNIX_TIMESTAMP( missions.created_at ) +games.timeout ) AND missions.winner =0")

// only need to update db via new Timeout
POOL.query("select * from missions inner join games on games.id = missions.game_id WHERE missions.status = 0", (err,results)=>{
	console.log(err, results);
 results.forEach((v)=>{
	 v.timeout =
		 new Timeout(function () {
		 	POOL.query("update mission set status = 1 where id = ?", v.id)
		}, v.timeout*1000);
 })
})

