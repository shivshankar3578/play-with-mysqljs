const events = require('events');
const util = require('util');

// class Mylib {
// 	constuctor(){
// 		//	call constuctor of EventEmitter similiar super()
// 		events.EventEmitter.call(this);
// 	}
// }

//	instead of class it works on function
function Mylib(){
	events.EventEmitter.call(this);
}

// console.log.(Mylib);
// //	this works on object also
// Mylib = Object.create({})
// events.EventEmitter.call(Mylib);


util.inherits(Mylib, events.EventEmitter );
//	__proto__ is constuctor of parent class, inherits works similiar
// Mylib.prototype.__proto__ = events.EventEmitter.prototype;



var myLib = new Mylib();
myLib.on('func', function(arr, val) {
		arr.push(val)
});

myLib  = function (arr,i) {
		return	arr.push(i)
}
module.exports = myLib;
