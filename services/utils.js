const https = require('https')
const BigCommerce = require('node-bigcommerce')

const bigCommerce = new BigCommerce({
  clientId: process.env.BIGC_CLIENT_ID,
  accessToken: process.env.BIGC_ACCESS_TOKEN,
  storeHash: process.env.BIGC_STORE_HASH,
  responseType: 'json',
  apiVersion: 'v3' // Default is v2
});

class RequestSAP {
    constructor(session) {
        if (!session) {
            throw new Error(
              'Session missing. The session object is required to make any call to the SAP API'
            );
        }
        this.session = session
    }

    static get FILTERS_FOR_SAP() {
        return "Valid%20eq%20%27tYES%27%20and%20ItemsGroupCode%20ne%20100%20and%20ItemsGroupCode%20ne%20106";
    }
  
    getItems(select, filter, skip) {
      var options = {
        host: 'glinkaudio.com',
        path: `/b1s/v1/Items?$select=${ select }&$filter=${ filter }&$skip=${ skip }`,
        port: '50000',
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          "content-type": "text/plain",
          "cookie": "B1SESSION=" + this.session + "; ROUTEID=.node1"
        }
      };
      //console.log(options);
      return new Promise(resolve => {
        resolve(this.sendGETRequest(options));
      })
    }
  
    getItem(sku) {
      var options = {
        host: 'glinkaudio.com',
        path: "/b1s/v1/Items('" + sku + "')",
        //since we are listening on a custom port, we need to specify it by hand
        port: '50000',
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          "content-type": "text/plain",
          "cookie": "B1SESSION=" + this.session + "; ROUTEID=.node1"
        }
      };
  
      return new Promise(resolve => {
        resolve(this.sendGETRequest(options));
      })
    }
  
    getSpecialPrices(filter, skip) {
      var options = {
        host: 'glinkaudio.com',
        path: '/b1s/v1/SpecialPrices?$filter=' + filter + '&$skip=' + skip,
        //since we are listening on a custom port, we need to specify it by hand
        port: '50000',
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          //'User-Agent': USER_AGENT,
          "content-type": "text/plain",
          "cookie": "B1SESSION=" + this.session + "; ROUTEID=.node1"
        }
      };
  
      /*var options = {
        uri: `https://glinkaudio.com:50000/b1s/v1/SpecialPrices?$filter=${ filter }&$skip=${ skip }`,
          method: "GET",
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            "cookie": "B1SESSION=" + this.session + "; ROUTEID=.node1"
          },
          timeout: 10000,
          followRedirect: true,
          rejectUnauthorized: false,
          maxRedirects: 10
      };*/
  
      return new Promise(resolve => {
        resolve(this.sendGETRequest(options));
      })
    }
  
    getPurchaseData(skip) {
      var options = {
        host: 'glinkaudio.com',
        path: "/b1s/v1/SQLQueries('sql06')/List?$skip=" + skip,
        //since we are listening on a custom port, we need to specify it by hand
        port: '50000',
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          "content-type": "text/plain",
          "cookie": "B1SESSION=" + this.session + "; ROUTEID=.node1"
        }
      };
  
      return new Promise(resolve => {
        resolve(this.sendGETRequest(options));
      })
    }
  
    sendGETRequest(options) {
      return new Promise(resolve => {
        var chunks = [];
        const req = https.request(options, res => {
          //console.log(`statusCode: ${res.statusCode}`)
  
          res.on('data', chunk => {
            chunks.push(chunk);
          })
  
          res.on('end', () => {
            var body = Buffer.concat(chunks);
            //console.log(body.toString());
            resolve(body);
          });
        })
  
        req.on('error', error => {
          console.error(error)
          resolve(error)
        })
  
        req.end()
      })
    }

    
}


function loginSAP () {
    const data = JSON.stringify({
        "CompanyDB": process.env.SAP_CONNECTION_COMPANYDB,
        "Password": process.env.SAP_CONNECTION_PASSWORD,
        "UserName": process.env.SAP_CONNECTION_USERNAME
    });

    var options = {
        host: 'glinkaudio.com',
        path: '/b1s/v1/Login',
        //since we are listening on a custom port, we need to specify it by hand
        port: '50000',
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
            "content-type": "text/plain",
            "cookie": process.env.SAP_CONNECTION_COOKIE
        }
    };

    return new Promise(resolve => {
        const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)
        //console.log('headers: ', res.headers)

        res.on('data', d => {
            //process.stdout.write(d)
            console.log(`Access Granted: ${ JSON.parse(d).SessionId }`);
            resolve(JSON.parse(d).SessionId);
        })
        })

        req.on('error', error => {
        console.error(error)
        resolve(error);
        })

        req.write(data)
        req.end()
    })
}

/**
 * Connections with BigCommerce, this functions are mostly used after fetching data 
 * from other placer such as SAP or jasperpim.com
 */

async function updateBatchProducts(body) {
  try {
    const data = await bigCommerce.put(`/catalog/products`, body)
    console.log(data)
    if (Object.keys(data).length > 0) {
      console.log("Successful Update");
      return 200
    }
  } catch (err) {
    if (err.code == 500) {
      setTimeout(()=> updateBatchProducts(body), 15000);
    } else {
      console.error(`REQUEST BODY: ${JSON.stringify(body)}\n================\n${err}`)
      return err.code
    }
  }
}

async function setBulkPricingTiers(priceList, body) {
  try {
    const data = await bigCommerce.put(`/pricelists/${ priceList }/records`, body)
    console.log(data)
    return 200
  } catch (err) {
    console.error(`REQUEST BODY: ${JSON.stringify(body)}\n================\n${err}`)
    return err.code
  }
}

module.exports = {
    sap: {
      RequestSAP,
      loginSAP,
    },
    bigCommerce: {
      request: bigCommerce,
      updateBatchProducts,
      setBulkPricingTiers
    }
}