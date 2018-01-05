//	config apn
if(req.app.get('env') === 'development')
	var options = {
		token: {
			key: path.join(__dirname, "apn/development/", "key.pem"),
			keyId: "key-id",
			teamId: "developer-team-id"
		},
		production: false
	};
else
	var options = {
		token: {
			key:  path.join(__dirname, "apn/production/", "key.pem"),
			keyId: "key-id",
			teamId: "developer-team-id"
		},
		production: false
	};
cservice = new apn.connection(options);

cservice.on("connected", function() {
    console.log("Connected");
});

cservice.on("transmitted", function(notification, device) {
    console.log("Notification transmitted to:" + device.token.toString("hex"));
});

cservice.on("transmissionError", function(errCode, notification, device) {
    console.error("Notification caused error: " + errCode + " for device ", device, notification);
    if (errCode === 8) {
        console.log("A error code of 8 indicates that the device token is invalid. This could be for a number of reasons - are you using the correct environment? i.e. Production vs. Sandbox");
    }
});

cservice.on("timeout", function() {
    console.log("Connection Timeout");
});

cservice.on("disconnected", function() {
    console.log("Disconnected from APNS");
});

cservice.on("socketError", console.error);

module.exports = cservice
