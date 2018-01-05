const events = require('events');
const util = require('util');


class Customer extends events {
	constructor() {
		super();
		var _this = this
		this.on("newRegistation", (customer,d) => {
			console.log(`newRegistation called`,d );
			// if (customer.password == 'password')
			// 	this.emit("validated", customer);
			// else
			// 	this.emit("registationFailed", customer);
		});

		this.on("validated", (customer) => {
				this.emit("added", customer);
		});

		this.on("added", (customer) => {
				this.emit("emailSent", customer);
		});

		this.on("emailSent", (customer) => {
				this.emit("registationSuccessful", customer);
		});
	}

	//    this is only public function
	register(email, password) {
			var customer = {
					email: email,
					password: password
			}
			this.emit("newRegistation", customer,{a:1})
			console.log(customer);
	}
}
util.inherits(Customer, events.EventEmitter )

module.exports =  Customer
