const myLib = require('./myLib');

var arr = [],
		i 	= 0
setInterval(()=>{
	// myLib.emit("func", arr, i)
	myLib(arr,i)
	i++
	console.log(arr);
}, 3000)
