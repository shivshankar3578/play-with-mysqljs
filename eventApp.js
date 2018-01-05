const Customer = require('./eventStyle');
customer = new Customer();
// console.log(customer);
// customer.on("registationSuccessful", ()=>{
// 	console.log("well done");
// })

// customer.on("registationFailed", ()=>{
// 	console.log("sorry error");
// })
console.log(customer.register);
// console.log(typeof customer.register);
// setTimeout(()=>customer.register(), 1000);
