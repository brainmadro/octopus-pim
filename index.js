const path = require('path')
const fs = require('fs')
const https = require('https')
const readline = require('readline')
const bodyParser = require('body-parser')
const Shopify = require('shopify-api-node')
const jwt = require('jsonwebtoken')
const express = require('express')
//const HttpsProxyAgent = require('https-proxy-agent')
//const admin = require("firebase-admin")
//const { getDatabase } = require('firebase-admin/database');
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackConfig = require('./webpack.config')
const PORT = process.env.PORT || 5000
const v1SyncRoutes = require('./routes/v1/syncRoutes')
const v1PIMRoutes = require('./routes/v1/pimRoutes')
const autoSynchronications = require('./services/bigCommerceService')
const app = express()

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', "Origin, -X-Requested-With, Content-Type, Accept, x-xsrf-token");
  next();
})
//app.set('views', path.join(__dirname, 'dist'))
//app.set('view engine', 'html')
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'dist/index.html')))
//app.use("/api/v1/sync", v1SyncRoutes)
app.use("/pim/v1", v1PIMRoutes)
//middleware for react
//app.use(webpackDevMiddleware(webpack(webpackConfig)))
//Running the server
const server = app.listen(PORT, () => console.log(`Server listening on port: ${ PORT }`))

//autoSynchronications();

module.exports = { app, server }


//Inicialization
//process.env.TOKEN_SECRET = require('crypto').randomBytes(64).toString('hex');
//console.log(process.env.TOKEN_SECRET);

/* const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken); */

/* const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_ACCESS_TOKEN,
  apiVersion: "2021-10"
}); */

/**
 * Firebase Cloud Firestore, disabled due to the quote of request
 * 
const serviceAccount = require(path.join(__dirname + '/shophedel-firebase-adminsdk-3nch3-064ccfd700.json'));
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();
const productsRef = db.collection('products'); 
 *
*/


  
/**
 * The custom listener for any situation.
 * @param {string} name 
 */

 function Event(name){
  this.name = name;
  this.callbacks = [];
}
Event.prototype.registerCallback = function(callback){
  this.callbacks.push(callback);
}

function Reactor(){
  this.events = {};
}

Reactor.prototype.registerEvent = function(eventName){
  var event = new Event(eventName);
  this.events[eventName] = event;
};

Reactor.prototype.dispatchEvent = function(eventName, eventArgs){
  this.events[eventName].callbacks.forEach(function(callback){
    callback(eventArgs);
  });
};

Reactor.prototype.addEventListener = function(eventName, callback){
  this.events[eventName].registerCallback(callback);
};


//Functions
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, process.env.TOKEN_SECRET.toString(), (err, user) => {
    console.log(err)

    if (err) return res.sendStatus(403)

    req.user = user

    next()
  })
}

async function addProductPromo(sku, type) {
  var bigCommerceItems = [];
  await productsRef.once("value", function(snapshot) {
    bigCommerceItems = snapshot.val();
  });
  const id = (typeof bigCommerceItems.find(x => x.sku == sku) != 'undefined') ? bigCommerceItems.find(x => x.sku == sku).bigcommerce_product_id : null;
  if (id == null) {
    return { data: false, error: "Couldn't find SKU"};
  }
  const product  = await bigCommerce.get(`/catalog/products/${ id }`)
  const item = product.data;
  const brand  = (item.brand_id > 0) ? await bigCommerce.get(`/catalog/brands/${ item.brand_id }`) : ''; 
  var variantId  = await bigCommerce.get(`/catalog/variants?product_id=${ id }`)
  variantId = variantId.data[0].id;
  const priceB2B  = await bigCommerce.get(`/pricelists/1/records/${variantId}`)
  if (item.option_set_id == null) {
    const typeRef = promosRef.child(type);
    const promoRef = typeRef.child(sku);
    promoRef.set({
      "id": item.id,
      "sku": item.sku,
      "brand": brand.data.name,
      "url": item.custom_url.url,
      "name": item.name,
      "inventory_level": item.inventory_level,
      "price": item.price,
      "price_b2b": priceB2B.data[0].price,
    });
    
    /* Version Cloud Firestore
    // Add a new document in collection @param {string} type with ramdom ID
    const res = await db.collection(`promos/promos/${type}`).add({
      "id": item.id,
      "sku": item.sku,
      "brand": brand.data.name,
      "url": item.custom_url.url,
      "name": item.name,
      "inventory_level": item.inventory_level,
      "price": item.price,
      "price_b2b": priceB2B.data[0].price,
    });
    console.log('Added document with ID: ', res.id); */
  }
  return { data: true, error: ""};
}

async function removePromoItem(sku, type) {
  /* Version Cloud FIrestore
  const query = await db.collection(`promos/promos/${type}`).where('sku', '==', sku);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
  
  async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
  
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve();
      return;
    }
  
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  
    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve);
    });
  } */
  const typeRef = promosRef.child(type);
  const promoRef = typeRef.child(sku);
  promoRef.set(null);
  typeRef.on('value', (snapshot) => {
    if (snapshot.val() == null) {
      createEmpty(type)
    }
  }, (errorObject) => {
    console.log('The read failed: ' + errorObject.name);
  }); 

  function createEmpty(type) {
    const typeRef = promosRef.child(type);
    typeRef.set("");
  }
}


/**
 * Block of syncronizations
 * 
 * syncProductCreated
 * @param {string} id 
 */


function readBrandsJSONL(filename) {
  return new Promise(resolve => {
    let res = [];

    function processLine(line) {
      const {id, vendor} = JSON.parse(line);
      res.push(vendor);
      return res;
    }

    const readInterface = readline.createInterface({
        input: fs.createReadStream('data/' + filename + '.jsonl'),
        //output: process.stdout,
        console: false
    });

    readInterface.on('line', processLine);

    readInterface.on('close', function() {
      const resultArray = res;
      //console.log(resultArray);
      resolve(resultArray);
    });
  });
}

function readJSONL(filename) {
  return new Promise(resolve => {
    let res = {};

    function processLine(line) {
      const {id, __parentId} = JSON.parse(line);

      // if there is no `__parentId`, this is a parent
      if (typeof __parentId === 'undefined') {
        res[line.id] = {
          id,
          childrens: []
        };
        return res;
      }

      // this is a child, create its parent if necessary
      if (typeof res[__parentId] === 'undefined') {
        //console.log(inventoryQuantity);
        res[__parentId] = {
          id: __parentId,
          childrens: []
        }
      }

      // add child to parent's children
      res[__parentId].childrens.push(JSON.parse(line));
      return res;
    }

    const readInterface = readline.createInterface({
        input: fs.createReadStream('data/' + filename + '.jsonl'),
        //output: process.stdout,
        console: false
    });

    readInterface.on('line', processLine);

    readInterface.on('close', function() {
      //console.log(res);
      const resultArray = Object.values(res);
      //console.log(resultArray);
      resolve(resultArray);
    });
  });
}

function sendPOSTPromised(hostname, path, headers, body) {
  return new Promise(resolve => {

    headers['Content-Type'] = 'application/json';
    //headers['Content-Length'] = body.length;

    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'POST',
      headers: headers
    }

    const req = https.request(options, res => {
      let data = '';
      //console.log(`statusCode: ${res.statusCode}`)

      res.on('data', d => {
        //process.stdout.write(d)
        data += d;
      })

      res.on('end', () => {
        //console.log(data);
        resolve(data);
      })
    })

    req.on('error', error => {
      resolve(error)
    })

    req.write(JSON.stringify(body))
    req.end()
  })
}

function sendDELETEPromised(hostname, path, headers, body) {
  return new Promise(resolve => {

    headers['Content-Type'] = 'application/json';
    //headers['Content-Length'] = body.length;

    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'DELETE',
      headers: headers
    }

    const req = https.request(options, res => {
      let data = '';
      //console.log(`statusCode: ${res.statusCode}`)

      res.on('data', d => {
        //process.stdout.write(d)
        data += d;
      })

      res.on('end', () => {
        //console.log(data);
        resolve(data);
      })
    })

    req.on('error', error => {
      resolve(error)
    })

    req.write(JSON.stringify(body))
    req.end()
  })
}

function sendPUTPromised(hostname, path, headers, body) {
  return new Promise(resolve => {

    headers['Content-Type'] = 'application/json';
    //headers['Content-Length'] = body.length;

    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'PUT',
      headers: headers
    }

    const req = https.request(options, res => {
      let data = '';
      console.log(`statusCode: ${res.statusCode}`)

      res.on('data', d => {
        //process.stdout.write(d)
        data += d;
      })

      res.on('end', () => {
        //console.log(data);
        resolve(data);
      })
    })

    req.on('error', error => {
      console.error(error)
    })

    req.write(JSON.stringify(body))
    req.end()
  })
}

function sendGETPromised(hostname, path, headers) {
  return new Promise(resolve => {

    headers['Content-Type'] = 'application/json';
    //headers['Content-Length'] = body.length;

    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'GET',
      headers: headers
    }

    const req = https.request(options, res => {
      let data = '';
      console.log(`statusCode: ${res.statusCode}`)

      res.on('data', d => {
        //process.stdout.write(d)
        data += d;
      })

      res.on('end', () => {
        //console.log(data);
        resolve(data);
      })
    })

    req.on('error', error => {
      console.error(error)
    })

    req.end()
  })
}

function sendGETStaticIPPromised(hostname, path, headers) {
  return new Promise(resolve => {
    headers['Content-Type'] = 'application/json';
    //headers['Content-Length'] = body.length;

    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'GET',
      headers: headers
    }

    const req = https.request(options, res => {
      let data = '';
      console.log(`statusCode: ${res.statusCode}`)

      res.on('data', d => {
        //process.stdout.write(d)
        data += d;
      })

      res.on('end', () => {
        //console.log(data);
        resolve(data);
      })
    })

    req.on('error', error => {
      console.error(error)
    })

    req.end()
  })
}

function generateAccessToken(username) {
  return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
}

function dateCompare(d1, d2){
  const date1 = new Date(d1);
  const date2 = new Date(d2);

  if(date1 > date2){
      //console.log(`${d1} is greater than ${d2}`)
  } else if(date1 < date2){
      //console.log(`${d2} is greater than ${d1}`)
  } else{
      //console.log(`Both dates are equal`)
  }
}

//Firebase Functions

async function getPromos() {
  const response = {};
  const promos = await promosRef.once("value", snapshot => snapshot)
  promos.forEach((data) => {
    response[data.key] = [];
    for(const i in data.val())
      response[data.key].push(data.val()[i]);
  });

  return new Promise((resolve, reject) => {
    var i = 0; 
    Object.keys(response).forEach(async (key, index, arr) => {
      const skuFilter = response[key].map(x => x.sku).join(',')
      const info = await bigCommerce.get(`/catalog/products?sku:in=${ skuFilter }`)
      response[key] = response[key].map(x => {
        const item = info.data.find(n => n.sku == x.sku);
        item.brand = x.brand
        item.price_b2b = x.price_b2b
        return item
      })
      
      if (i === arr.length-1) {
        resolve(response)
      }
      i++;
    })
  })
}

async function getViewedProducts() {
  const res = new Array();
  const temp = await productsViewedRef.orderByChild("times_viewed").once('value', snapshot => snapshot, errorGettingData)
  temp.forEach((data) => {
    if (data.hasChild("sku")) {
      var json = {
        id: data.val().id,
        sku: data.val().sku,
        times_viewed: data.val().times_viewed,
        title: data.val().title,
        url: data.val().url
      }
    } else {
      var json = {
        id: data.val().id,
        times_viewed: data.val().times_viewed,
        title: data.val().title
      }
    }
    res.push(json);
  });
  return res.reverse();
}

function updateViewedProduct(snapshot, id, sku, title, lastView) {
  if (snapshot.exists()) {
    console.log("Updating");
    snapshot.forEach((data) => {
      const times = data.val().times_viewed + 1;
      productsViewedRef.child(data.key.toString()).update({
        id: id,
        last_view: lastView,
        sku: sku,
        title: title,
        times_viewed: times
      }, (error) => {
        if (error) {
          console.log("The write failed...");
        } else {
          console.log("Data saved successfully!");
          console.log(data.key, data.val());
        }
      })
    });
  } else {
    //Creando nuevo nodo
    console.log("Creating");
    const pushRef = productsViewedRef.push();
    pushRef.set({
      id: id,
      last_view: lastView,
      sku: sku,
      title: title,
      times_viewed: 1
    })
  }
}

function errorGettingData(error) {
  console.log("Error Obteniendo Data");
  console.error(error);
}

//console.log(generateAccessToken({id: "hedelusa.com"}));

function testPrices(sendSMS) {
  return new Promise(async (resolve) => {
    var productsSAP = [];
    var productsBigCommerce = [];

    const session = await sapLogin();
    const requestSAP = new RequestSAP(session);

    function getPricesFromBigCommerce(page) {
      bigCommerce.get(`/pricelists/1/records?include=sku&limit=200` + page)
        .then(data => {
          productsBigCommerce = productsBigCommerce.concat(data.data.map(x => {
            return { sku: x.sku, price: x.price};
          }));
          productsBigCommerce = productsBigCommerce.filter(x => x.sku != '');
          if (data.meta.pagination.hasOwnProperty('links')) {
            getPricesFromBigCommerce(data.meta.pagination.links.next);
          } else {
            if (data.meta.pagination.total_pages > 1 && data.meta.pagination.current_page <= data.meta.pagination.total_pages) {
              getPricesFromBigCommerce(`&page=${data.meta.pagination.current_page+1}`);
            } else {
              check();
            }
          }
        })
        .catch((err) => console.error(err));
    }

    async function getData(skip) {
      var items = await requestSAP.getItems("ItemCode,ItemPrices,Valid", filtersForSAP, skip);
      items = JSON.parse(items);
      items.value.forEach((item, i) => {
        productsSAP.push({
          sku: item.ItemCode,
          price: item.ItemPrices[5].Price
        });
      });
      if (items.hasOwnProperty('odata.nextLink')) {
        skip += 20;
        getData(skip);
      } else {
        //console.log(productsSAP);
        console.log("Scanning products from BigCommerce");
        getPricesFromBigCommerce('');
      }
    }

    function check() {
      var corrects = 0;
      var incorrects = [];
      var undefineds  = [];
      productsBigCommerce.forEach(element => {
        const p = productsSAP.find(x => x.sku == element.sku);
        if (typeof p != 'undefined') {
          if (p.price == element.price) {
            corrects++;
          } else {
            incorrects.push({ sku:p.sku, pricebc: element.price, pricesap: p.price});
          }       
        } else {
          undefineds.push(element);
        }
      });

      console.log(`${corrects} matches`);
      console.log(`In ${incorrects.length} product(s) the price doesn't match`);
      fs.writeFileSync(path.join(__dirname + '/data/tests/incorrects.json'), JSON.stringify(incorrects));
      console.log(`${undefineds.length} product(s) couldn't be found in the SAP list`);
      fs.writeFileSync(path.join(__dirname + '/data/tests/undefineds.json'), JSON.stringify(undefineds));

      if (sendSMS && incorrects.length > 0) {
        const body = `In ${incorrects.length} product(s) the price doesn't match\n` + incorrects.reduce((acc, cur) => acc += `${cur.sku}\n`, '');
        client.messages
        .create({ body: body, from: process.env.SMS_SENDER, to: process.env.MAIN_PHONE })
        .then(message => console.log("Mensaje: " + message.sid + "\n" + message.body));
      }

      if (!sendSMS && incorrects.length > 0) {
        resolve(false);
      }

      if (incorrects.length == 0) {
        resolve(true);
      }
    }

    try {
      getData(0);
      console.log("Scanning products from SAP");
    } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e)
    }
  })
}

async function testInventory(sendSMS) {
  return new Promise(async (resolve) => {
    var productsSAP = [];
    var productsBigCommerce = [];

    const session = await sapLogin();
    var requestSAP = new RequestSAP(session);

    function getProductsFromBigCommerce(page) {
      bigCommerce.get(`/catalog/products` + page)
        .then(data => {
          productsBigCommerce = productsBigCommerce.concat(data.data.map(x => {
            return {
              'sku': x.sku,
              'id': x.id,
              "inventory_level": x.inventory_level,
              "order_quantity_minimum": x.order_quantity_minimum,
              "order_quantity_maximum": x.order_quantity_maximum
            };
          }));
          productsBigCommerce = productsBigCommerce.filter(x => x.sku != '');
          if (data.meta.pagination.links.hasOwnProperty('next')) {
            //console.log(data.meta.pagination.links.current);
            getProductsFromBigCommerce(data.meta.pagination.links.next);
          } else {
            getVariantsFromBigCommerce('');
          }
        })
        .catch((err) => console.error(err));
    }

    function getVariantsFromBigCommerce(page) {
      bigCommerce.get(`/catalog/variants` + page)
        .then(data => {
          productsBigCommerce = productsBigCommerce.concat(data.data.map(x => {
            return {
              'sku': x.sku,
              'id': x.id,
              'option_values': x.option_values.length,
              "inventory_level": x.inventory_level,
              "order_quantity_minimum": x.order_quantity_minimum,
              "order_quantity_maximum": x.order_quantity_maximum
            };
          }));
          productsBigCommerce = productsBigCommerce.filter(x => x.option_values != []);
          if (data.meta.pagination.links.hasOwnProperty('next')) {
            //console.log(data.meta.pagination.links.current);
            getVariantsFromBigCommerce(data.meta.pagination.links.next);
          } else {
            check();
          } 
        })
        .catch((err) => console.error(err));
    }

    function check() {
      var corrects = 0;
      var incorrects = [];
      var undefineds  = [];
      productsBigCommerce.forEach(element => {
        const p = productsSAP.find(x => x.sku == element.sku);
        if (typeof p != 'undefined') {
          if (element.hasOwnProperty('option_values')) {
            if (p.inventory_level == element.inventory_level) {
              corrects++;
            } else {
              incorrects.push({ 
                sku:p.sku, 
                inventorybc: element.inventory_level, 
                inventorysap: p.inventory_level, 
                order_quantity_minimumsap: p.order_quantity_minimum,
                order_quantity_maximumsap: p.order_quantity_maximum
              });
            }         
          }
          else if (p.inventory_level == element.inventory_level && p.order_quantity_minimum == element.order_quantity_minimum && p.order_quantity_maximum == element.order_quantity_maximum) {
            corrects++;
          } else {
            incorrects.push({ 
              sku:p.sku, 
              inventorybc: element.inventory_level, 
              inventorysap: p.inventory_level, 
              order_quantity_minimumbc: element.order_quantity_minimum, 
              order_quantity_minimumsap: p.order_quantity_minimum,
              order_quantity_maximumbc: element.order_quantity_maximum, 
              order_quantity_maximumsap: p.order_quantity_maximum
            });
          }       
        } else {
          undefineds.push(element);
        }
      });

      console.log(`${corrects} matches`);
      console.log(`In ${incorrects.length} product(s) the inventory doesn't match`);
      fs.writeFileSync(path.join(__dirname + '/data/tests/incorrects.json'), JSON.stringify(incorrects));
      console.log(`${undefineds.length} product(s) couldn't be found in the SAP list`);
      fs.writeFileSync(path.join(__dirname + '/data/tests/undefineds.json'), JSON.stringify(undefineds));

      if (sendSMS && incorrects.length > 0) {
        const body = `In ${incorrects.length} product(s) the inventory level doesn't match\n` + incorrects.reduce((acc, cur) => acc += `${cur.sku}\n`, '');
        client.messages
        .create({ body: body, from: process.env.SMS_SENDER, to: process.env.MAIN_PHONE })
        .then(message => console.log("Mensaje: " + message.sid + "\n" + message.body));
      }

      if (!sendSMS && incorrects.length > 0) {
        resolve(false);
      }

      if (incorrects.length == 0) {
        resolve(true);
      }
    }

    async function getData(skip) {
      var items = await requestSAP.getItems("ItemCode,ItemWarehouseInfoCollection,U_hedel_Pack_Multiples,Valid", filtersForSAP, skip);
      items = JSON.parse(items);
      items.value.forEach(item => {
        if (item.ItemWarehouseInfoCollection[0].WarehouseCode == "01") {
          var level = (item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed;
          if (level < item.U_hedel_Pack_Multiples && level > 0) {
            productsSAP.push({
              'sku': item.ItemCode,
              "inventory_level": level,
              "order_quantity_minimum": level,
              "order_quantity_maximum": level,
              "pack_multiples": item.U_hedel_Pack_Multiples
            });
          } else {   
            productsSAP.push({
              'sku': item.ItemCode,
              "inventory_level": level,
              "order_quantity_minimum": item.U_hedel_Pack_Multiples,
              "order_quantity_maximum": 0,
              "pack_multiples": item.U_hedel_Pack_Multiples
            });
          }
        }
      });
      if (items.hasOwnProperty('odata.nextLink')) {
        skip += 20;
        getData(skip);
      } else {
        //console.log(productsSAP);
        console.log("Scanning products from BigCommerce");
        getProductsFromBigCommerce('');
      }
    }

    try {
      await getData(0);
      console.log("Scanning products from SAP");
    } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e)
    }
  })
}

/* fs.watchFile(path.join(__dirname + '/data/items-by-sku.json'), (curr, prev) => {
  client.messages.create({ body: "File Modified", from: process.env.SMS_SENDER, to: process.env.DEVELOPER_NUMBER });
  console.log(`the current mtime is: ${curr.mtime}`);
  console.log(`the previous mtime was: ${prev.mtime}`);
}); */


/**
 * PostgreSQL Connection
 * Temporal connections with Jasper for synchronization
 * until PIM Hedel is finish */ 

function syncProductTable() {
  const getData = (page) => {
    const toCreate = [], toUpdate = [];
    sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products?page=${ page }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
    .then(response => JSON.parse(response))
    .then(data => {
      if (data.hasOwnProperty('products')) {
        const productsJasper = data.products.filter(x => typeof x.sku != 'undefined');
        productsJasper.forEach(async (item, i) => {
          const text = `SELECT * FROM products WHERE sku = '${item.sku}'`;
          try {
            const res = await clientDB.query(text)
            if (res.rows.length > 0) {
              toUpdate.push(item)
            } else {
              toCreate.push(item)
            }
          } catch (error) {
            console.log(error.stack)
            console.log(text);
          }
          if (i == productsJasper.length-1) {
            createProducts(toCreate);
            updateProducts(toUpdate);
          }
        });
        if (typeof data.links != 'undefined' && typeof data.links.next == 'string') {
          const last = new URL(data.links.last).searchParams.get("page");
          const next = new URL(data.links.next).searchParams.get("page");
          console.log(`next: ${next} last: ${last}`);
          setTimeout(() => getData(next), 5000);
        } else {
          console.log(data.links);
        }
      } else {
        console.error(data);
      }      
    });
  }

  const createProducts = (toCreate) => {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
    console.log(toCreate.length);
    toCreate.forEach(async item => {
      var text = `INSERT INTO products (jasper_id, name, asset_thumbnail, option_set_id, brand_id, sku, is_bundle, category_ids, is_visible, enabled, desc_short, desc_long, price, inventory, created_at, update_at, featured, barcode, assets, tags, related_products, pack_multiple, master_case, weight, attribute_set_ids)
      VALUES (
        ${item.id}, 
        '${item.name}', 
        1, 
        1, 
        ${(item.brand_id) ? item.brand_id : 1}, 
        '${item.sku}', 
        ${(item.is_bundle == 0) ? false : true}, 
        '[]'::json, 
        ${(item.is_visible == 0) ? false : true}, 
        ${(item.enabled == 0) ? false : true}, 
        '${(typeof item.desc_short != 'undefined') ? item.desc_short.replace(/'/g, "&#8218;") : ''}', 
        '${(typeof item.desc_long != 'undefined') ? item.desc_long.replace(/'/g, "&#8218;") : ''}', 
        '[]'::json,
        '[]'::json,
        '${now.toISOString()}', 
        '${now.toISOString()}', 
        ${(item.featured == 0) ? false : true}, 
        ${(item.barcodes.length > 0) ? "'{ \"type\": \"UPC-A\", \"barcode\": " + item.barcodes[0].barcode + "}'::json" : "'{}'::json"}, 
        '{}'::json, 
        '{}'::json, 
        '{}'::json,
        1, 
        1, 
        0, 
        '{}'::json) RETURNING id;`;
      try {
        const res = await clientDB.query(text)
        console.log(res.rows[0].id)
        const attributes = item.product_attributes.reduce((acc, cur) => ({
          ...acc,
          [cur.slug]: cur
        }), {});
        const title = (attributes.hasOwnProperty('catalog_title')) ? attributes['catalog_title'].value : item.name;
        const groupTitle = (attributes.hasOwnProperty('catalog_group_title')) ? attributes['catalog_group_title'].value : '';
        const sort = (attributes.hasOwnProperty('catalog_sort')) ? attributes['catalog_sort'].value : '';
        text = `INSERT INTO indesign_catalog (product_id, attributes, catalog_master_family_en, catalog_master_family_es, catalog_main_category_en, catalog_main_category_es, catalog_subcategory_en, catalog_subcategory_es, indesign_category_tree, price, inventory, sku, title, group_title, sort)
        VALUES (
          ${res.rows[0].id}, 
          '', 
          '',
          '',
          '',
          '',
          '',
          '',
          '${(item.categories.length > 0) ? item.categories[0].fqn_cache : null}',
          '',
          '',
          '${item.sku}',
          '${title}',
          '${groupTitle}',
          '${sort}');`;
        try {
          const res = await clientDB.query(text)
          //console.log(res)
        } catch (error) {
          console.log("UC", error.stack)
          console.log(text);
        }
      } catch (error) {
        console.log(error.stack)
        console.log(text);
      }
    })
  }

  const updateProducts = (toUpdate) => {
    //console.log(toUpdate.length);
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
    toUpdate.forEach(async item => {
      var text = `UPDATE products SET (jasper_id, name, asset_thumbnail, option_set_id, brand_id, sku, is_bundle, is_visible, enabled, desc_short, desc_long, price, inventory, update_at, featured, barcode, assets, tags, related_products) = ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::json, $17::json, $18::json, $19::json)
      WHERE sku = '${item.sku}' RETURNING id;`
      const values = [
        item.id, 
        item.name, 
        1, 
        1, 
        (item.brand_id) ? item.brand_id : 1, 
        item.sku, 
        (item.is_bundle == 0) ? false : true,
        (item.is_visible == 0) ? false : true, 
        (item.enabled == 0) ? false : true, 
        (typeof item.desc_short != 'undefined') ? item.desc_short.replace(/'/g, "&#8218;") : '', 
        (typeof item.desc_long != 'undefined') ? item.desc_long.replace(/'/g, "&#8218;") : '', 
        '[]', 
        '[]', 
        now.toISOString(), 
        (item.featured == 0) ? false : true, 
        (item.barcodes.length > 0) ? { "type": "UPC-A", "barcode": item.barcodes[0].barcode } : '{}', 
        '{}', 
        '{}', 
        '{}'
      ]
      try {
        const res = await clientDB.query(text, values)
        console.log("UPDATE ID: ", res.rows[0].id)
        const attributes = item.product_attributes.reduce((acc, cur) => ({
          ...acc,
          [cur.slug]: cur
        }), {});
        const title = (attributes.hasOwnProperty('catalog_title')) ? attributes['catalog_title'].value : item.name;
        const groupTitle = (attributes.hasOwnProperty('catalog_group_title')) ? attributes['catalog_group_title'].value : '';
        const sort = (attributes.hasOwnProperty('catalog_sort')) ? attributes['catalog_sort'].value : '';
        text = `UPDATE indesign_catalog SET indesign_category_tree = '${(item.categories.length > 0) ? item.categories[0].fqn_cache : null}' WHERE product_id = ${res.rows[0].id};
        UPDATE indesign_catalog SET sku = '${item.sku}' WHERE product_id = ${res.rows[0].id};
        UPDATE indesign_catalog SET title = '${title}' WHERE product_id = ${res.rows[0].id};
        UPDATE indesign_catalog SET group_title = '${groupTitle}' WHERE product_id = ${res.rows[0].id};
        UPDATE indesign_catalog SET sort = '${sort}' WHERE product_id = ${res.rows[0].id};`;
        try {
          const res = await clientDB.query(text)
          //console.log(res)
        } catch (error) {
          console.log("UC", error.stack)
          console.log(text);
        }
      } catch (error) {
        console.log(error.stack)
        console.log(text);
        console.log(values);
      }
    })
  }

  getData(1);  
}

function getProductsJasperPostgreSQL() {    
  const getData = (page) => {
    sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products?page=${ page }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
    .then(response => JSON.parse(response))
    .then(data => {
      if (data.hasOwnProperty('products')) {
        const productsJasper = data.products.filter(x => typeof x.sku != 'undefined');
        productsJasper.forEach(async item => {
          const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
          const text = `INSERT INTO products (jasper_id, name, asset_thumbnail, option_set_id, brand_id, sku, is_bundle, category_ids, is_visible, enabled, desc_short, desc_long, price, inventory, created_at, update_at, featured, barcode, assets, tags, related_products, catalog_main_family_en, catalog_main_family_es, catalog_main_category_en, catalog_main_category_es, catalog_subcategory_en, catalog_subcategory_es) 
          VALUES (${item.id}, '${item.name}', 1, 1, ${item.brand_id}, '${item.sku}', ${(item.is_bundle == 0) ? false : true}, '${JSON.stringify(item.categories.map(x => x.id))}', ${(item.is_visible == 0) ? false : true}, ${(item.enabled == 0) ? false : true}, '${(typeof item.desc_short != 'undefined') ? item.desc_short : ''}', '${(typeof item.desc_long != 'undefined') ? item.desc_long : ''}', '', '', '${now.toISOString()}', '${now.toISOString()}', ${(item.featured == 0) ? false : true}, ${(item.barcodes.length > 0) ? "'{ type: " +  '"UPC-A"' + ", barcode: " + item.barcodes[0].barcode + "}'" : "'{}'"}, '', '', '', '', '', '', '', '', '');`;
          try {
            const res = await clientDB.query(text)
            console.log(res)
          } catch (error) {
            console.log(error.stack)
            console.log(text);
          }
        });        
        if (typeof data.links != 'undefined' && typeof data.links.next == 'string') {
          const last = new URL(data.links.last).searchParams.get("page");
          const next = new URL(data.links.next).searchParams.get("page");
          console.log(`next: ${next} last: ${last}`);
          setTimeout(() => getData(next), 5000);
        } else {
          console.log(data.links);
        }
      } else {
        console.error(data);
      }      
    });
  }
  getData(1);
}

//getProductsJasperPostgreSQL()

async function getFromSAP() {
  var products = [];

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);

  async function getData(skip, resolve) {
    var items = await requestSAP.getItems("ItemCode,ItemPrices,U_Catalog_Main_Category,U_Catalog_Sub_Category,U_Catalog_Main_Category_SP,U_Catalog_Sub_Cat_SP,U_Master_Family,U_Master_Family_ES,U_hedel_Pack_Multiples,U_hedel_mfr_packing,U_Carton_Weight", filtersForSAP, skip);
    items = JSON.parse(items);
    products = products.concat(items.value);
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getData(skip, resolve);
    } else {
      products.forEach(async item => {
        const text = `UPDATE indesign_catalog SET price = '${item.ItemPrices[5].Price}' WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET pack_multiple = '${(item.U_hedel_Pack_Multiples) ? item.U_hedel_Pack_Multiples : 1}' 
        WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET master_case = '${(item.U_hedel_mfr_packing) ? item.U_hedel_mfr_packing : 1}' 
        WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET weight = ${(item.U_Carton_Weight) ? item.U_Carton_Weight : 0} 
        WHERE sku = '${item.ItemCode}';`;
        try {
          const res = await clientDB.query(text)
          console.log(res)
        } catch (error) {
          console.log(error.stack)
          console.log(text);
        }
      });
    }
  }

  return new Promise(resolve => {
    getData(0, resolve)
  })
  
}

//syncProductTable();
//getFromSAP()



//background-image: url(data:image/png;base64,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);
//background-color:#0094d0;

function getBrandsJasperPostgreSQL() {    
  const getData = (page) => {
    sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/brands?page=${ page }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
    .then(response => JSON.parse(response))
    .then(data => {
      if (data.hasOwnProperty('brands')) {
        const brands = data.brands;
        brands.forEach(async item => {
          const text = `INSERT INTO brands (name, image_url, description, jasper_id) 
          VALUES ('${item.name}', '${(typeof item.image_url != 'undefined') ? item.image_url : ''}', '${(typeof item.description != 'undefined') ? item.description : ''}', '${item.id}');`;
          try {
            const res = await clientDB.query(text)
            console.log(res)
          } catch (error) {
            console.log(error.stack)
            console.log(text);
          }
        })
        if (typeof data.links != 'undefined' && typeof data.links.next == 'string') {
          const last = new URL(data.links.last).searchParams.get("page");
          const next = new URL(data.links.next).searchParams.get("page");
          console.log(`next: ${next} last: ${last}`);
          setTimeout(() => getData(next), 5000);
        } else {
          console.log(data.links);
        }
      } else {
        console.error(error);
      }      
    });
  }
  getData(1);
}