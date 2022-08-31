const router = require('express').Router()
const ipapi = require('ipapi.co')


router.get('/location', (req, res) => {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.startsWith('localhost') || ip.startsWith('127') || ip.startsWith('::')) ip = '191.95.167.121'
      ipapi.location(response => {
        res.send(response)
	}, ip);
})

// Detect when a client sign in and send a sms as a notification
router.post('/hound', (req, res) => {
    var email = req.body.email;
    if (email != process.env.DEVELOPER_EMAIL) {
      var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      var callback = function(res){
        console.log(res);
        bigCommerce.get(`/customers`)
          .then(data => {
            // Catch any errors, or handle the data returned
            var customer = data.data.filter(function(item) { return item.email === email; });
            sendSMSHound([res, customer[0]]);
          })
          .catch((err) => console.error(err));
      };
      ipapi.location(callback, ip);
    }
    res.send(email);
})

router.get('/check-ip', (req, res) => {
  (async () => {
    var ip = await sendGETStaticIPPromised("hedelusa-apps-server.herokuapp.com", "/get-ip", {
    "content-type": "application/json",
    "cache-control": "no-cache"
    });
    console.log(ip);
    res.send(ip);
  })();
  
})

router.get('/manual-sql-query', extraFeaturesControllers.manualSQLQuery)

router.get('/check', (req, res) => {
    res.send(JSON.stringify({
      date: new Date()
    }))
})