
function sendSMSHound(houndData) {
	let customer = (houndData[1].first_name && houndData[1].last_name) ? houndData[1].first_name + " " + houndData[1].last_name : "unknown";
	let email = (houndData[1].email) ? houndData[1].email : "unknown";
	let country = (houndData[0].country_name) ? houndData[0].country_name.toString() : "unknown";
	let region = (houndData[0].region) ? houndData[0].region.toString() : "unknown";
	let city = (houndData[0].city) ? houndData[0].city.toString() : "unknown";
	let postal = (houndData[0].postal) ? houndData[0].postal.toString() : "unknown";
	let notes = (houndData[1].notes) ? houndData[1].notes : "unknown";
	let registrationIpAddress = (houndData[1].registration_ip_address) ? houndData[1].registration_ip_address : "unknown";
	let customerGroupId = (houndData[1].customer_group_id) ? houndData[1].customer_group_id : "unknown";
	let company = (houndData[1].company) ? houndData[1].company : "unknown";
	if (email != "unknown") {
	  var body = customer + " just login with the email: " + email + " and the Hound found this: \nLocation: " + country + ", " + region + ", " + city + ", " + postal +
	  "\n== More info == " + "\nCompany: " + company + "\nCustomer Group ID: " + customerGroupId + "\nRegistration IP Address: " + registrationIpAddress + "\nNotes: " + notes;
	  client.messages
	  .create({ body: body, from: process.env.SMS_SENDER, to: process.env.MAIN_PHONE })
	  .then(message => console.log("Mensaje: " + message.sid + "\n" + message.body));
	} else {
	  console.log("Nop");
	  var body = "Wrong Email";
	}
  }

const manualSQLQuery = (req, res) => {
    clientDB
    .query(req.body.query)
    .then(response => res.send(response))
    .catch(e => res.send(e.stack))
}