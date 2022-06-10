const express = require('express')
const path = require('path')
const fs = require('fs')
const https = require('https')
const ipapi = require('ipapi.co')
const readline = require('readline')
const bodyParser = require('body-parser')
const Shopify = require('shopify-api-node')
const BigCommerce = require('node-bigcommerce')
const jwt = require('jsonwebtoken')
const HttpsProxyAgent = require('https-proxy-agent')
const admin = require("firebase-admin")
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getDatabase } = require('firebase-admin/database');
const PORT = process.env.PORT || 5100


//Inicialization
//process.env.TOKEN_SECRET = require('crypto').randomBytes(64).toString('hex');
//console.log(process.env.TOKEN_SECRET);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const bigCommerce = new BigCommerce({
  clientId: process.env.BIGC_CLIENT_ID,
  accessToken: process.env.BIGC_ACCESS_TOKEN,
  storeHash: process.env.BIGC_STORE_HASH,
  responseType: 'json',
  apiVersion: 'v3' // Default is v2
});

const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP,
  apiKey: process.env.SHOPIFY_API_KEY,
  password: process.env.SHOPIFY_ACCESS_TOKEN,
  apiVersion: "2021-10"
});

const { Client } = require('pg');
const config = ({
  user: "doadmin",
  password: "AVNS_l4bwNxfXNaMgkUz_Uzr",
  host: "db-postgresql-nyc3-38904-do-user-9878983-0.b.db.ondigitalocean.com",
  port: "25060",
  database: "defaultdb",
  ssl: { rejectUnauthorized: false }
});

const clientDB = new Client(config)
clientDB.connect(err => {
  if (err) {
    console.error('connection error', err.stack)
  } else {
    console.log('connected')
  }
})

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

// Fetch the service account key JSON file contents
var serviceAccount = require(path.join(__dirname + '/shophedel-firebase-adminsdk-3nch3-064ccfd700.json'));

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // The database URL depends on the location of the database
  databaseURL: "https://shophedel.firebaseio.com"
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
/* var db = admin.database();
var ref = db.ref("restricted_access/secret_document");
ref.once("value", function(snapshot) {
  console.log(snapshot.val());
}); */

const db = getDatabase();
const productsRef = db.ref('products/items');
const productsBulkPricingListRef = db.ref('products/bulk_pricing_list');
const productsViewedRef = db.ref('products/viewed');
const promosRef = db.ref("promos");

const filtersForSAP = "Valid%20eq%20%27tYES%27%20and%20ItemsGroupCode%20ne%20100%20and%20ItemsGroupCode%20ne%20106"

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', "Origin, -X-Requested-With, Content-Type, Accept, x-xsrf-token");
    next();
  })
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  
  //GET
  .get('/', (req, res) => res.render('pages/index'))
  .get('/dashboard', async (req, res) => {
    if(req.query.debug && req.query.debug == 'promos') {
      const promosData = fs.readFileSync(path.join(__dirname + '/data/promo-products.json'));
      res.send(JSON.parse(promosData));
    } else {    
      const response = await getPromos();
      res.render('pages/dashboard', response)
      //res.render('pages/promos', response)
    }
  })
  .get('/jasper/product-relations', (req, res) => {
    res.render('pages/product-relations')
  })
  .get('/location', (req, res) => {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.startsWith('localhost') || ip.startsWith('127') || ip.startsWith('::')) ip = '191.95.167.121'
      ipapi.location(response => {
        res.send(response)
      }, ip);
  })
  .get('/test', (req, res) => {
    clientDB
    .query(req.body.query)
    .then(response => res.send(response))
    .catch(e => res.send(e.stack))
  })
  .get('/check-ip', (req, res) => {
    (async () => {
      var ip = await sendGETStaticIPPromised("hedelusa-apps-server.herokuapp.com", "/get-ip", {
      "content-type": "application/json",
      "cache-control": "no-cache"
      });
      console.log(ip);
      res.send(ip);
    })();
    
  })
  .get('/sync/product/:id', (req, res) => {
    var id = req.params.id;
    if (id.length > 8) {
      sinctronizarItem(id, 23);
    } else {
      sincronizarItemFromSAP(id)
    }
    res.render('pages/index')
  })
  .get('/sync/collection/:id', (req, res) => {
    var id = req.params.id;
    sinctronizarItems(id, 23);
    res.render('pages/index')
  })
  .get('/sync/prices', async (req, res) => {
    await syncPrices(true);
    res.send(JSON.stringify({ data: "Completed", error: ""}));
  })
  .get('/sync/base-prices', (req, res) => {
    syncBasePrices();
    res.render('pages/index')
  })
  .get('/sync/inventory', async (req, res) => {
    await syncInventory(true);
    res.send(JSON.stringify({ data: "Completed", error: ""}));
  })
  .get('/sync/metafields', (req, res) => {
    //syncMetafields();
    res.render('pages/index')
  })
  .get('/sync/purchase-dates', async (req, res) => {
    await syncPurchaseDataSAP(true);
    res.send(JSON.stringify({ data: "Completed", error: ""}));
  })
  .get('/products-bigcommerce/sku', async (req, res) => {
    const response = await getProductsBigcommerceBySku(req.query.sku);
    res.send(response);
  })
  .get('/products-from-bigcommerce', async (req, res) => {
    if(req.query.debug && req.query.debug == 'json') {
      var bigCommerceItems = [];
      await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
      res.send(JSON.parse(bigCommerceItems));
    } else if(req.query.debug && req.query.debug == 'incorrects') {
      const bigCommerceItems = fs.readFileSync(path.join(__dirname + '/data/tests/incorrects.json'));
      res.send(JSON.parse(bigCommerceItems));
    } else if(req.query.debug && req.query.debug == 'undefineds') {
      const bigCommerceItems = fs.readFileSync(path.join(__dirname + '/data/tests/undefineds.json'));
      res.send(JSON.parse(bigCommerceItems));
    } else {
      getProductsBigCommerce();
      res.render('pages/index')
    }
  })
  .get('/products-from-jasper', async (req, res) => {
    if(req.query.debug && req.query.debug == 'json') {
      var bigCommerceItems = [];
      await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
      res.send(JSON.parse(bigCommerceItems));
    } else {
      getProductsJasper();
      res.render('pages/index')
    }
  })
  .get('/metafields-from-bigcommerce', (req, res) => {
    const index = req.query.index;
    getMetafieldsBigCommerce(index);
    res.render('pages/index');
  })
  .get('/sync/bulk-pricing', async (req, res) => {
    await syncQuantityBreaks(true);
    res.send(JSON.stringify({ data: "Completed", error: ""}));
  })
  .get('/check', (req, res) => {
    res.send(JSON.stringify({
      date: new Date()
    }))
  })
  .get('/metafields/product/:id', (req, res) => {
    var id = req.params.id;
    bigCommerce.get(`/catalog/products/${ id }/metafields`)
      .then(data => {
        // Catch any errors, or handle the data returned
        console.log(data);
        res.send(JSON.stringify(data))
      })
      .catch((err) => console.error(err));
  })
  .get('/metafields/product/:product/variant/:variant', (req, res) => {
    var product = req.params.product;
    var variant = req.params.variant;
    bigCommerce.get(`/catalog/products/${product}/variants/${variant}/metafields`)
      .then(data => {
        // Catch any errors, or handle the data returned
        console.log(data);
        res.send(JSON.stringify(data))
      })
      .catch((err) => console.error(err));
  })
  .get('/promo-products', async (req, res) => {
    const response = await getPromos();
    res.send(response);
  })
  .get('/viewed-products', async (req, res) => {
    const viewedProducts = await getViewedProducts();
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(viewedProducts))
  })

  //POST
  .post('/shopify-webhook/bulk-operation', (req, res) => {
    console.log(res.statusCode);
    console.log(req.headers);
    console.log(req.body);
    console.log(JSON.stringify(req));
    /*const query = `query {
      node(id: "${ response.bulkOperationRunQuery.bulkOperation.id }") {
        ... on BulkOperation {
          url
          partialDataUrl
        }
      }
    }`;
    shopify
      .graphql(query)
      .then((response) => {
        //console.log("URL", response.node.url);
        const file = fs.createWriteStream("data/bulk-data-shopify.jsonl");
        const request = https.get(response.node.url, function(response) {
          response.pipe(file);
        });
      })
      .catch((err) => console.error(err));*/
    res.sendStatus(res.statusCode)
    res.send("Success")
  })
  .post('/webhooks/bigcommerce/product/created', (req, res) => {
    var id = req.body.data.id;
    console.log(`Created product: ${id}`);
    syncProductCreated(id);
    res.send("Success")
  })
  .post('/webhooks/bigcommerce/product/deleted', (req, res) => {
    var id = req.body.data.id;
    console.log(`Deleting: ${id}`);
    syncProductDeleted(id, req.body.data.type)
    res.send("Success")
  })
  .post('/webhooks/jasper/product/created', (req, res) => {
    var id = req.body.data.id;
    console.log(`Created product: ${id}`);
    syncProductCreated(id);
    res.send("Success")
  })
  .post('/hound', (req, res) => {
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
  .post('/promos-add-product', async (req, res) => {
    console.log(req.body);
    const response = await addProductPromo(req.body.sku, req.body.type);
    res.send(response);
  })
  .post('/promos-remove-product', async (req, res) => {
    console.log(req.body);
    const response = await removePromoItem(req.body.sku, req.body.type);
    console.log(response);
    res.send({});
  })
  .post('/product-from-jasper', async (req, res) => {
    console.log(req.body);
    const response = await getProductJasper(req.body.id);
    res.send(response);
  })
  .post('/viewed-products/update', async (req, res) =>{
    const id = req.body.id
    const sku = req.body.sku
    const title = req.body.title
    const lastView = req.body.last_view
    await productsViewedRef.orderByChild('sku').equalTo(sku).once('value', snapshot => updateViewedProduct(snapshot, parseInt(id), sku, title, lastView), errorGettingData)
    res.sendStatus(200)
  })
  .post('/jasper/create-relations', async (req, res) =>{
    const response = await createProductRelationsJasper(req.body.type, req.body.items);
    res.send(response)
  })
  .post('/jasper/delete-relations', async (req, res) =>{
    const response = await deleteProductRelationsJasper(req.body.type, req.body.items)
    res.send(response)
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
  
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

/**
 * BigCommerce Sync 
 * This activate the sync process at the time needed
 * Remember the hour of the server is different */ 

setInterval(async () => {
  const time = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));

  if (time.getDay() == 0 && time.getHours() == 12 && time.getMinutes() == 0) {
    getProductsBigCommerce();
  }
  
  if (time.getHours() == 6 && time.getMinutes() == 0 || time.getHours() == 12 && time.getMinutes() == 0 || time.getHours() == 1 && time.getMinutes() == 0) {
    const check = await testPrices(false);
    if (!check) {
      await syncPrices();
      if (time.getHours() == 1) {
        testPrices(true);        
      }
    }
  }
  if (time.getHours() == 6 && time.getMinutes() == 20 || time.getHours() == 12 && time.getMinutes() == 20 || time.getHours() == 1 && time.getMinutes() == 20) {
    const check = await testInventory(false);
    if (!check) {
      await syncInventory();
      if (time.getHours() == 1) {
        testInventory(true);
      }
    }
  }
  if (time.getHours() ==  6 && time.getMinutes() == 40 || time.getHours() == 12 && time.getMinutes() == 40 || time.getHours() == 1 && time.getMinutes() == 40) {
    syncQuantityBreaks();
  }
  if (time.getHours() == 6 && time.getMinutes() == 45 || time.getHours() == 12 && time.getMinutes() == 45 || time.getHours() == 1 && time.getMinutes() == 45) {
    syncPurchaseDataSAP();
  }
  if (time.getHours() == 6 && time.getMinutes() == 50 || time.getHours() == 12 && time.getMinutes() == 50 || time.getHours() == 1 && time.getMinutes() == 50) {
    //syncMetafields();
  }
}, 58000);

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

function getProductsBigCommerce() {  
  const products = [];

  async function getData(page) {
    bigCommerce.get('/catalog/variants' + page)
    .then(data => {
      data.data.forEach(item => {
        if (item.option_set_id == null && item.sku != '') {
          /* const res = await db.collection('products').doc(item.sku).set({
            "sku": item.sku,
            "bigcommerce_product_id": item.product_id,
            "bigcommerce_variant_id": item.id,
            "option_values": item.option_values
          }); */
          products.push({
            "sku": item.sku,
            "bigcommerce_product_id": item.product_id,
            "bigcommerce_variant_id": item.id,
            "option_values": item.option_values
          })
        }
      });
      if (data.meta.pagination.links.hasOwnProperty('next')) {
        console.log(`Getting products from BigCommerce ${Math.floor((parseInt(data.meta.pagination.current_page)*100)/parseInt(data.meta.pagination.total_pages))}% Completed`);
        getData(data.meta.pagination.links.next);
      }

      if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
        console.log('Proccess finished wait for synchronizing Jasper Ids');
        //getVariantsBigCommerce(bigCommerceItems);
        console.log(products.length);
        getProductsJasper(products);
      }
    })
    .catch((err) => console.error(err));
  }
  
  getData(''); 
}

function getVariantsBigCommerce(bigCommerceItems) {

  getData('');
  function getData(page) {
    bigCommerce.get('/catalog/variants' + page)
    .then(data => {
      data.data.forEach(item => {
        if (item.option_values.length > 0) {
          if (typeof bigCommerceItems.find(x => x.sku == item.sku) == 'undefined') {
            bigCommerceItems.push({
              "sku": item.sku,
              "bigcommerce_product_id": item.product_id,
              "bigcommerce_variant_id": item.id
            })
          }
        }
      })

      if (data.meta.pagination.links.hasOwnProperty('next')) {
        console.log(`Getting variants from BigCommerce ${Math.floor((parseInt(data.meta.pagination.current_page)*100)/parseInt(data.meta.pagination.total_pages))}% Completed`);
        getData(data.meta.pagination.links.next);
      }

      if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
        productsRef.set(bigCommerceItems);
        console.log('Proccess finished');
      }
    })
    .catch((err) => console.error(err));
  }
}

async function getMetafieldsBigCommerce(index) {
  var bigCommerceItems = [];
  await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
  
  var i,j, temporary = [], chunk = 100;
  for (i = 0,j = bigCommerceItems.length; i < j; i += chunk) {
    temporary.push(bigCommerceItems.slice(i, i + chunk));
  }
  
  setMetafieldChunks(index)
  function setMetafieldChunks(i) {
    console.log(`Sync: ${i} of ${temporary.length}`);
    temporary[i].forEach(async (element) => {
      const index = bigCommerceItems.findIndex(x => x.sku == element.sku);
      if (!element.hasOwnProperty('metafields')) {
        if (element.hasOwnProperty('bigcommerce_variant_id')) {
          var data = await getData(element, 'variant');
          element['metafields'] = data;
          bigCommerceItems.fill(element, index, index+1);
        } else {
          var data = await getData(element, 'product');
          element['metafields'] = data;
          bigCommerceItems.fill(element, index, index+1);
        }
        productsRef.set(bigCommerceItems);
        console.log("Writed: " + element.sku);
      }
    });
  }

  async function getData(x, type) {
    return new Promise(resolve => {
      var metafields = [];
      var reactor = new Reactor();
      reactor.registerEvent('finish');
      reactor.addEventListener('finish', function(){
        resolve(metafields)
      });
      
      const fetchProductMetafields = (page) => {
        bigCommerce.get(`/catalog/products/${ x.bigcommerce_product_id }/metafields${ page }`)
        .then(data => {
          metafields = data.data;

          if (data.meta.pagination.links.hasOwnProperty('next')) {
            fetchProductMetafields(data.meta.pagination.links.next);
          }

          if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
            reactor.dispatchEvent('finish');
          }
        })
        .catch((err) => console.error(err));
      }

      const fetchVariantMetafields = (page) => {
        bigCommerce.get(`/catalog/products/${ x.bigcommerce_product_id }/variants/${ x.bigcommerce_variant_id }/metafields${ page }`)
        .then(data => {
          metafields = data.data;

          if (data.meta.pagination.links.hasOwnProperty('next')) {
            fetchVariantMetafields(data.meta.pagination.links.next);
          }

          if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
            reactor.dispatchEvent('finish');
          }
        })
        .catch((err) => console.error(err));
      }

      switch (type) {
        case 'product':
          fetchProductMetafields('')
          break;

        case 'variant':
          fetchVariantMetafields('')        
          break;
      
        default:
          console.error('type undefined');
          break;
      }
    })
  }
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

function getProductsBigcommerceBySku(products) {
  return new Promise(resolve => {
    var response = [];
    
    const getData = (page) => {
      bigCommerce.get(`/catalog/products?sku:in=${products}&page=${page}&include=custom_fields,images,bulk_pricing_rules`)
      .then(async data => {
        response = response.concat(data.data);
        if (data.meta.pagination.current_page < data.meta.pagination.total_pages) {
          getData(data.meta.pagination.current_page + 1);
        } else {
          bigCommerce.get(`/pricelists/1/records?include=bulk_pricing_tiers&sku:in=${products}`)
          .then(prices => {
            resolve(response.map(x => {
              let item = prices.data.find(n => n.product_id == x.id);
              // Could be undefined if there is no price in this list
              if (typeof item != 'undefined') {
                x.price_b2b = item.price;
                x.bulk_pricing_tiers = (typeof item.bulk_pricing_tiers != 'undefined') ? item.bulk_pricing_tiers : [];
              } else {
                x.price_b2b = 0;
                x.bulk_pricing_tiers = [];
              }
              return x;
            }));
          })
        }
      })
      .catch((err) => console.error(err));
    }
    getData(1);
  })
}

//Jasper Functions

function getProductsJasper(products) {
  const getData = (page) => {
    sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products?page=${ page }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
    .then(response => JSON.parse(response))
    .then(data => {
      if (data.hasOwnProperty('products')) {
        const productsJasper = data.products.filter(x => typeof x.sku != 'undefined');
        productsJasper.forEach(item => {
          if (item.sku != 'undefined') {
            /* Version Cloud Firestore
            const cityRef = db.collection('products').doc(item.sku);
            // Set JasperPIM ID
            const res = await cityRef.update({ jasper_id: item.id }); */
            /* const itemRef = productsRef.orderByChild('sku').equalTo(item.sku)
            itemRef.update({
              'jasper_id': item.id
            }); */
            const productData = products.find(x => x.sku == item.sku)
            if (typeof productData != 'undefined') {
              productData['jasper_id'] = item.id;
              products.splice(products.findIndex(x => x.sku == item.sku), 1, productData);
              console.log(products[products.findIndex(x => x.sku == item.sku)]);
            }
          }
          
          /* const productData = itemsBySku.find(x => x.sku == item.sku)
          if (typeof productData != 'undefined') {
            productData['jasper_id'] = item.id;
            itemsBySku.splice(itemsBySku.findIndex(x => x.sku == item.sku), 1, productData);
          } */
        });        
        if (typeof data.links != 'undefined' && typeof data.links.next == 'string') {
          const last = new URL(data.links.last).searchParams.get("page");
          const next = new URL(data.links.next).searchParams.get("page");
          console.log(`next: ${next} last: ${last}`);
          setTimeout(() => getData(next), 5000);
        } else {
          console.log(data.links);
          productsRef.set(products);
          //fs.writeFileSync(path.join(__dirname + '/data/items-by-sku.json'), JSON.stringify(itemsBySku));
        }
      } else {
        console.error(data);
      }      
    });
  }
  if (typeof products != 'undefined') {
    getData(1);    
  }
}

function getProductJasper(id) {
  console.log(`B: ${id}, A:${parseInt(id)}`);
  console.log(typeof id);
  if (typeof id != 'undefined') {
    return new Promise(async resolve => {
      /*  Version for Cloud Firestore
      const dataRef = db.collection('products');
      const snapshot = await dataRef.where('bigcommerce_product_id', '==', parseInt(id)).get();
      if (snapshot.empty) {
        console.log('No matching documents.');
        return;
      }  
      snapshot.forEach(doc => {      
        sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ doc.data().jasper_id }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
        .then(data => {
          data = JSON.parse(data);
          resolve(data);
        });
      }) */
      productsRef.orderByChild('bigcommerce_product_id').equalTo(parseInt(id)).on('child_added', (snapshot) => {
        //console.log(snapshot.key);
        sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ snapshot.val().jasper_id }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
        .then(data => {
          data = JSON.parse(data);
          resolve(data);
        });
      });
    });
  } else {
    return { error: "Error con el id" + id }
  }
  
}

function createProductRelationsJasper(type, relatedProducts) {
  var i = 0;
  const iterar = (resolve) => {
    const products = relatedProducts.filter(x => x != relatedProducts[i]);
    var promises = [];
    products.forEach(element => {
      console.log(`${relatedProducts[i]} to ${element}`);
      promises.push(sendPOSTPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ relatedProducts[i] }/relations/${ element }/type/${ type }`, { 'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN }, {}));
    })

    Promise.all(promises).then(values => {
      if (values.hasOwnProperty("errors")) {
        console.log(values);
        resolve(false)
      }
      if (i < relatedProducts.length-1) {
        i += 1;
        iterar(resolve);
      } else {
        resolve(true)
      }
    })
  }

  return new Promise(resolve => {
    iterar(resolve);
  })
}

function deleteProductRelationsJasper(type, relatedProducts) {
  var i = 0;
  const iterar = (resolve) => {
    const products = relatedProducts.filter(x => x != relatedProducts[i]);
    var promises = [];
    products.forEach(element => {
      console.log(`${relatedProducts[i]} to ${element}`);
      promises.push(sendDELETEPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ relatedProducts[i] }/relations/${ element }/type/${ type }`, { 'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN }, {}));
    })

    Promise.all(promises).then(values => {
      if (values.errors) {
        console.log(values);
        resolve(false)
      }
      if (i < relatedProducts.length-1) {
        i += 1;
        iterar(resolve);
      } else {
        resolve(true)
      }
    })
  }

  return new Promise(resolve => {
    iterar(resolve);
  })
}

/**
 * Block of syncronizations
 * 
 * syncProductCreated
 * @param {string} id 
 */

 function sapLogin() {
  const data = JSON.stringify({
    "CompanyDB": "HEDEL_LIVE",
    "Password": "hedel",
    "UserName": "manager"
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
      "cookie": "B1SESSION; ROUTEID=.node1"
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

 async function syncPurchaseDataSAP(manual) {
  var products = new Array();

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);

  async function getPurchaseData(skip, resolve) {
    var items = await requestSAP.getPurchaseData(skip);
    items = JSON.parse(items);
    items.value.forEach(item => {
      if (item.ItemCode.length < 2) {
        console.log(item.ItemCode);          
      }
      
      
      /* if ((item.OnHand - item.IsCommited) <= 0) {
        /* if (item.ItemCode == "750-507") {
          console.log(`PRODUCTO (${item.ItemCode}): ${item.OnHand - item.IsCommited}`);
        } 
        products.push({
          sku: item.ItemCode,
          date: date,
          quantity: item.OpenQty,
          committed: item.IsCommited,
          stock: item.OnHand
        });
        const currentProduct = products.find(x => x.sku == item.ItemCode)
        if (typeof currentProduct != 'undefined') {
          if(new Date(currentProduct.date) > new Date(date)){
            const index = products.findIndex(x => x.sku == item.ItemCode);
            products[index] = {
              sku: item.ItemCode,
              date: date,
              quantity: item.OpenQty,
              committed: item.IsCommited,
              stock: item.OnHand
            }
            //console.log(`${date} es mejor que ${products[item.ItemCode].date}`)
          }
        } else {
          products.push({
            sku: item.ItemCode,
            date: date,
            quantity: item.OpenQty,
            committed: item.IsCommited,
            stock: item.OnHand
          });
        }        
        data.sort((a, b) => {
                    const keyA = a.custom_fields.find(x => x.name == 'Sort');
                    const keyB = b.custom_fields.find(x => x.name == 'Sort');
                    // Compare the 2 dates
                    if (typeof keyA != 'undefined' && typeof keyB != 'undefined') {
                        if (keyA.value < keyB.value) return -1;
                        if (keyA.value > keyB.value) return 1;
                    }
                    return 0;
                });   
      } */
    });
    products = products.concat(items.value)
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getPurchaseData(skip, resolve);
    } else {
      // Out of Stock Filter
      products = products.filter(x => { 
        if ((x.OnHand - x.IsCommited) <= 0 && (x.OnHand - x.IsCommited) + x.OpenQty > 0) {
          const date = x.ShipDate.substring(0, 4) + "-" + x.ShipDate.substring(4, 6) + "-" + x.ShipDate.substring(6, 8) + "T00:00:00-05:00"; //"2022-01-29T00:00:00-05:00"
          x.ShipDate = date;
          return x
        }
      })

      //Sort by dates
      products.sort((a, b) => {
        const dateA = new Date(a.ShipDate);
        const dateB = new Date(b.ShipDate);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
      })

      //Removing duplicates
      const codes = products.map(x => x.ItemCode);
      const indexes = codes.map(x => codes.indexOf(x));
      products = products.filter(x => {
        if (indexes.includes(products.indexOf(x))) {
          return x
        }
      })
      console.log(`Found products for synchronization: ${products.length}`);
      productsRef.once("value", snapshot => sync(resolve, snapshot.val()));
      
    }
  }

  async function sync(resolve, bigCommerceItems) {
    const items = [];
    const notFound = [];
    products.forEach(async item => { 
      const inventoryLevel = (item.OnHand - item.IsCommited) + item.OpenQty;
      /* if (item.ItemCode == "721-002") {
        console.log(`PRODUCTO BUSCADO (${item.ItemCode}): ${inventoryLevel}  & ${item.OnHand - item.IsCommited}`);
      } */
      if (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) != 'undefined') {
        items.push({
          "id": bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id,
          "availability": "preorder",
          "preorder_release_date": item.ShipDate,
          //"is_preorder_only": true
          //"inventory_level": inventoryLevel
        });
      } else {
        notFound.push(item);
        //console.log(`Producto inexistente en PIM: SKU ${item.sku}`);
      }
    })
    console.log("Ready to sync: ", items.length);
    console.log("Not found items in BigCommerce: ", notFound.length);
    if (manual) {
      resolve(true)
    }
    const chunk = 10;
    for (var i = 0,j = items.length; i < j; i += chunk) {
        const temporary = items.slice(i, i + chunk);
        updateBatchProducts(temporary);
    }
  }

  return new Promise(resolve => {
    getPurchaseData(0, resolve);
  })
}

async function syncProductCreated(id) {
  var bigCommerceItems = [];
  await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());

  //Get information from local data
  async function getData(id) {
    return new Promise(resolve => {
      bigCommerce.get(`/catalog/products/${id}`)
        .then(data => {
            resolve(data.data);
        })
        .catch((err) => console.error(err));
    })
  }

  const product = await getData(id);
  
  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);
  
  if (product.option_set_id == null) { // It's a product without variants
    var item = await requestSAP.getItem(product.sku);
    item = JSON.parse(item);
    
    if (item.error && item.error.code == -2028) {
      console.log("Ese SKU no existe en SAP");
    } else {
      var level = (item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed;
      var promises = [];
      var metafieldsInfo = [];
      var metafields = [{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "master_case",
        "value": (item.U_hedel_mfr_packing == null) ? "1" : String(item.U_hedel_mfr_packing),
        "description": "Master Case"
      },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "inner_case",
        "value": (item.U_hedel_pack == null) ? "1" : String(item.U_hedel_pack),
        "description": "Inner Case"
      },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_length",
        "value": (item.U_Carton_Length == null) ? "1" : String(item.U_Carton_Length),
        "description": "Carton Length"
      },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_width",
        "value": (item.U_Carton_Width == null) ? "1" : String(item.U_Carton_Width),
        "description": "Carton width"
      },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_height",
        "value": (item.U_Carton_Height == null) ? "1" : String(item.U_Carton_Height),
        "description": "Carton Height"
      },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_weight",
        "value": (item.U_Carton_Weight == null) ? "1" : String(item.U_Carton_Weight),
        "description": "Carton Weight"
      },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "pack_multiple",
        "value": (item.U_hedel_Pack_Multiples == null) ? "1" : String(item.U_hedel_Pack_Multiples),
        "description": "Pack Multiple"
      }];
      
      bigCommerce.put(`/catalog/products/${ id }`, { 
        "price": item.ItemPrices[1].Price, 
        "inventory_level": level, 
        "inventory_warning_level": parseInt(level*0.1), 
        "inventory_tracking": "product",
        "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight,
        "upc": (item.BarCode == null) ? "" : item.BarCode,
        "order_quantity_minimum": (item.U_hedel_Pack_Multiples == null || item.U_hedel_Pack_Multiples == "-") ? 1 : parseInt(item.U_hedel_Pack_Multiples)

      })
      .then(data => {
        console.log(`The product ${ data.data.sku } recently created has been updated`);
        //syncPurchaseDataSAP(); //Update information if the product has been created before arrive
        bigCommerceItems.push({
          "sku": data.data.sku,
          "bigcommerce_product_id": id
        })
        metafields.forEach((metafield) => {
          promises.push(bigCommerce.post(`/catalog/products/${ id }/metafields`, metafield))
        });
        Promise.all(promises).then(async (values) => {
          var tempItem = bigCommerceItems.find(x => x.bigcommerce_product_id == id)
          tempItem["metafields"] = values.map(x => x.data);
          tempItem["jasper_id"] = "";
          tempItem["price"] = item.ItemPrices[5].Price;
          productsRef.set(bigCommerceItems);
          console.log(tempItem);
        });
        return data.data;
      })
      .then(data => {
        var priceInfo = [{
          sku: data.sku,
          price: item.ItemPrices[5].Price,
          currency: "usd"
        }];
        setBulkPricingTiers(1, priceInfo);
      })
      .catch((err) => console.error(err));    
    }
  } else {
    var filter = "";
    var ids = [];
    
    bigCommerce.put(`/catalog/products/${ id }`, { "inventory_tracking": "variant" })
    .then(data => {})
    .catch((err) => console.error(err));

    bigCommerce.get(`/catalog/products/${id}/variants`)
    .then(data => {
      let items = data.data;        

      items.forEach(element => {
        filter += `ItemCode%20eq%20'${ element.sku }'%20or%20`;
        ids.push({"sku": element.sku,"id": element.id});
      });

      return { "ids": ids, "filters": filter.slice(0, -8) }
    })
    .then(async (data) => {
      var infoToUpdate = [];
      
      var items = await requestSAP.getItems("ItemCode,ItemPrices,ItemWarehouseInfoCollection,BarCode,U_Carton_Weight,U_hedel_Pack_Multiples,Valid", data.filters, 0);
      items = JSON.parse(items);
      
      items.value.forEach(element => {
        var level = (element.ItemWarehouseInfoCollection[0].InStock - element.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : element.ItemWarehouseInfoCollection[0].InStock - element.ItemWarehouseInfoCollection[0].Committed;
        
        bigCommerceItems.push({
          "sku": element.ItemCode,
          "bigcommerce_product_id": id,
          "bigcommerce_variant_id":data.ids.find(x => x.sku == element.ItemCode).id
        })

        infoToUpdate.push({ 
          "id": data.ids.find(x => x.sku == element.ItemCode).id,
          "inventory_level": level,
          "inventory_warning_level": parseInt(level*0.1),
          "price": element.ItemPrices[1].Price, 
          "weight": element.U_Carton_Weight,
          "upc": element.BarCode    
        })
      });

      productsRef.set(bigCommerceItems);

      var i,j, temporary, chunk = 50;
      for (i = 0,j = infoToUpdate.length; i < j; i += chunk) {
        temporary = infoToUpdate.slice(i, i + chunk);
        syncBulkInventory(null, temporary);
      }
      setTimeout(() => { syncPurchaseDataSAP() }, 5000); //Update information if the product has been created before arrive        
      return items;
    })
    .then(data => {
      var priceInfo = [];
      data.value.forEach(element => {
        priceInfo.push({
          sku: element.ItemCode,
          price: element.ItemPrices[5].Price,
          currency: "usd"
        })
      });      
      setBulkPricingTiers(1, priceInfo);
    })
    .catch((err) => console.error(err));
  }
}

async function syncProductDeleted(id, type) {
  var bigCommerceItems = [];
  await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
  if (type == "product") {
    const index = bigCommerceItems.findIndex(x => x.bigcommerce_product_id == id);
    bigCommerceItems.splice(index, 1);
    if (typeof bigCommerceItems.find(x => x.bigcommerce_product_id == id) == 'undefined') {
      console.log("Product deleted");
    }
    productsRef.set(bigCommerceItems);
  } else {
    const index = bigCommerceItems.findIndex(x => x.bigcommerce_variant_id == id);
    bigCommerceItems.splice(index, 1);
    if (typeof bigCommerceItems.find(x => x.bigcommerce_variant_id == id) == 'undefined') {
      console.log("Variant deleted");
    }
    productsRef.set(bigCommerceItems);
  }
}

async function syncCustomFields() {

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);

  var items = await requestSAP.getItem("ItemCode,ItemName,ItemPrices,ItemWarehouseInfoCollection,InventoryWeight,U_Catalog_Main_Category,U_Catalog_Sub_Category,U_hedel_Pack_Multiples,U_Catalog_Sub_Category,Valid", filtersForSAP, skip);
  items = JSON.parse(items);
  items.value.forEach((item, i) => {

  });

}

async function syncPrices(manual) {
  var products = [];
  var prices = [];
  var bigCommerceItems = [];
  await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);
  
  async function getData(skip, resolve) {
    var items = await requestSAP.getItems("ItemCode,ItemPrices,Valid", filtersForSAP, skip);
    items = JSON.parse(items);
    items.value.forEach(item => {
      
      const bigCommerceItem = (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) != 'undefined') ? bigCommerceItems.find(x => x.sku == item.ItemCode) : {};
      prices.push({
        sku: item.ItemCode,
        price: item.ItemPrices[5].Price,
        currency: "usd"
      });
      products.push({
        id: bigCommerceItem.bigcommerce_product_id,
        sku: item.ItemCode,
        price: item.ItemPrices[1].Price
      });
      /* if (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) == 'undefined') {
        //console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
      } else {
        prices.push({
          sku: item.ItemCode,
          price: item.ItemPrices[5].Price,
          currency: "usd"
        });
        products.push({
          id: bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id,
          price: item.ItemPrices[1].Price
        });
      } */
    });
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getData(skip, resolve);
    } else {
      sync(resolve);
    }
  }

  function sync(resolve) {
    const itemsSku = bigCommerceItems.map(x => x.sku);
    console.log("Products A Length: ",products.length);
    prices = prices.filter(x => itemsSku.includes(x.sku))
    products = products.filter(x => itemsSku.includes(x.sku))
    console.log("Products B Length: ",products.length);
    
    if (manual) {
      resolve(true);
    }
    
    var chunk = 10;
      for (var i = 0;i < products.length;i += chunk) {
        const temporary = products.slice(i, i + chunk);
        updateBatchProducts(temporary);
      }
      
      chunk = 1000;
      for (var i = 0; i < prices.length; i += chunk) {
        var temporary = prices.slice(i, i + chunk);
        setBulkPricingTiers(1, temporary);
        if (temporary.length < i) {
          resolve(true);
        }
      }/* 
      prices.forEach(element => {
        const productData = bigCommerceItems.find(x => x.sku == element.sku)
        productData['price'] = element.price;
        bigCommerceItems.splice(bigCommerceItems.findIndex(x => x.sku == element.sku), 1, productData);
        fs.writeFileSync(path.join(__dirname + '/data/items-by-sku.json'), JSON.stringify(bigCommerceItems));        
      }) */
  }

  return new Promise(resolve => {
    getData(0, resolve);
  })
  
}

async function syncBasePrices() {
  var products = [];

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);

  async function getData(skip) {
    var items = await requestSAP.getItems("ItemCode,ItemPrices,Valid", filtersForSAP, skip);
    items = JSON.parse(items);
    products = products.concat(items.value);
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getData(skip);
    } else {
      var bigCommerceItems = [];
      await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
      var prices = [];
      products.forEach((item, i) => {
        if (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) == 'undefined') {
          console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
        } else {
          if (!bigCommerceItems.find(x => x.sku == item.ItemCode).hasOwnProperty("bigcommerce_variant_id")) {
            /*prices.push({
              "id": bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id,
              "price": item.ItemPrices[1].Price
            });*/ // para version 2 del código max 10 por arreglo
            bigCommerce.put(`/catalog/products/${ bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id }`, { price: item.ItemPrices[1].Price })
              .then(data => {
                // Catch any errors, or handle the data returned
                console.log(data.data.sku + " Updated");
              })
              .catch((err) => console.error(err));
          } else {
            bigCommerce.put(`/catalog/products/${ bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id }/variants/${ bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_variant_id }`, { price: item.ItemPrices[1].Price })
              .then(data => {
                // Catch any errors, or handle the data returned
                console.log(data.data.sku + " Updated");
              })
              .catch((err) => console.error(err));
          }
        }
      });
      syncBulkPrices(prices);
    }
  }
  /*function updatePrices() {
    var bigCommerceItems = require(path.join(__dirname + '/data/items-by-sku.json'));
    //var brandId = brands.brands.filter(function(brand) { return brand.name === item.brand; });
    console.log(items);

    items.value.forEach((item, i) => {
      if (!bigCommerceItems[item.ItemCode]) {
        console.log("Este producto está activo en SAP pero no existe en BigCommerce: " + item.ItemCode);
      } else {
        console.log(item.ItemCode + ":" + item.ItemPrices[1].Price);
        bigCommerce.put('/catalog/products/' + bigCommerceItems[item.ItemCode].bigcommerce_product_id, { price: item.ItemPrices[1].Price })
          .then(data => {
          // Catch any errors, or handle the data returned
          //console.log(data.data.price);
        })
        .catch((err) => console.error(err));
      }
    });
  };*/

  try {
    await getData(0);
  } catch (e) {
  e.message === 'HTTP request failed'
    ? console.error(JSON.stringify(e.response, null, 2))
    : console.error(e)
  }
}

async function syncInventory(manual) {
  var products = [];

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);
  
  async function getData(skip, resolve) {
    var items = await requestSAP.getItems("ItemCode,ItemWarehouseInfoCollection,U_hedel_Pack_Multiples,U_Carton_Weight,Valid", filtersForSAP, skip);
    items = JSON.parse(items);
    products = products.concat(items.value);
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getData(skip, resolve);
    } else {
      productsRef.once("value", snapshot => sync(resolve, snapshot.val()));
    }
  }

  async function sync(resolve, bigCommerceItems) {
    var inventoriesProducts = [];
    var inventoriesVariants = [];
    const itemsSku = bigCommerceItems.map(x => x.sku);
    console.log("Products A Length: ",products.length);
    products = products.filter(x => itemsSku.includes(x.ItemCode))
    console.log("Products B Length: ",products.length);
    products.forEach(item => {
      if (item.ItemWarehouseInfoCollection[0].WarehouseCode == "01") {
        const bigCommerceItem = bigCommerceItems.find(x => x.sku == item.ItemCode);
        var level = (item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed;
        var packMultiple = (parseInt(item.U_hedel_Pack_Multiples) > 0) ? parseInt(item.U_hedel_Pack_Multiples) : 1;
        //If it's a product without variants
        if (!bigCommerceItem.hasOwnProperty("option_values") || bigCommerceItem.option_values.length == 0) {
          if (level < packMultiple && level > 0) {
            inventoriesProducts.push({
              "id": bigCommerceItem.bigcommerce_product_id,
              "inventory_level": level,
              "inventory_warning_level": parseInt(level*0.1),
              "inventory_tracking": "product",
              "order_quantity_minimum": level,
              "order_quantity_maximum": level,
              "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
            });
          } else {
            inventoriesProducts.push({
              "id": bigCommerceItem.bigcommerce_product_id,
              "availability": "available",
              "inventory_level": level,
              "inventory_warning_level": parseInt(level*0.1),
              "inventory_tracking": "product",
              "order_quantity_minimum": packMultiple,
              "order_quantity_maximum": 0,
              "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
            });
          }
        }
        else {
          inventoriesVariants.push({
            "id": bigCommerceItem.bigcommerce_variant_id,
            "inventory_level": level,
            "inventory_warning_level": parseInt(level*0.1),
            "weight": item.U_Carton_Weight
          });
          if (level < packMultiple && level > 0) {
            const metafield = {
              "permission_set": "read_and_sf_access",
              "namespace": "sap",
              "key": "pack_multiples",
              "value": String(level),
              "description": "Pack Multiples"
            }
            bigCommerce.post(`/catalog/products/${bigCommerceItem.bigcommerce_product_id}/variants/${bigCommerceItem.bigcommerce_variant_id}/metafields`, metafield)
            .then(data => {
              //console.log(data);
            })
            .catch((err) => {
              console.error(err.code);
              if (err.code == 409) {
                bigCommerce.put(`/catalog/products/${bigCommerceItem.bigcommerce_product_id}/variants/${bigCommerceItem.bigcommerce_variant_id}/metafields/${bigCommerceItem.metafields.find(x => x.key == 'pack_multiples').id}`, metafield)
                .then(data => {
                  console.log("Se Actualizó", data);
                })
                .catch((err) => console.error(err));                    
              }
            });
          }
          bigCommerce.put(`/catalog/products/${bigCommerceItem.bigcommerce_product_id}`, { "inventory_tracking": "variant" })
          .then(data => {
            //console.log("Se Actualizó", data);
          })
          .catch((err) => console.error(err));
        }
      }
      /* if (typeof element == 'undefined') {
        //console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
      } else {
        if (item.ItemWarehouseInfoCollection[0].WarehouseCode == "01") {
          var level = (item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed;
          var packMultiple = (parseInt(item.U_hedel_Pack_Multiples) > 0) ? parseInt(item.U_hedel_Pack_Multiples) : 1;
          //If it's a product without variants
          if (!element.hasOwnProperty("bigcommerce_variant_id")) {
            if (level < packMultiple && level > 0) {
              inventoriesProducts.push({
                "id": element.bigcommerce_product_id,
                "inventory_level": level,
                "inventory_warning_level": parseInt(level*0.1),
                "inventory_tracking": "product",
                "order_quantity_minimum": level,
                "order_quantity_maximum": level,
                "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
              });
            } else {
              inventoriesProducts.push({
                "id": element.bigcommerce_product_id,
                "inventory_level": level,
                "inventory_warning_level": parseInt(level*0.1),
                "inventory_tracking": "product",
                "order_quantity_minimum": packMultiple,
                "order_quantity_maximum": 0,
                "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
              });
            }
          }
          else {
            inventoriesVariants.push({
              "id": element.bigcommerce_variant_id,
              "inventory_level": level,
              "inventory_warning_level": parseInt(level*0.1),
              "weight": item.U_Carton_Weight
            });
            if (level < packMultiple && level > 0) {
              const metafield = {
                "permission_set": "read_and_sf_access",
                "namespace": "sap",
                "key": "pack_multiples",
                "value": String(level),
                "description": "Pack Multiples"
              }
              bigCommerce.post(`/catalog/products/${element.bigcommerce_product_id}/variants/${element.bigcommerce_variant_id}/metafields`, metafield)
              .then(data => {
                //console.log(data);
              })
              .catch((err) => {
                console.error(err.code);
                if (err.code == 409) {
                  bigCommerce.put(`/catalog/products/${element.bigcommerce_product_id}/variants/${element.bigcommerce_variant_id}/metafields/${element.metafields.find(x => x.key == 'pack_multiples').id}`, metafield)
                  .then(data => {
                    console.log("Se Actualizó", data);
                  })
                  .catch((err) => console.error(err));                    
                }
              });
            }
            bigCommerce.put(`/catalog/products/${element.bigcommerce_product_id}`, { "inventory_tracking": "variant" })
            .then(data => {
              //console.log("Se Actualizó", data);
            })
            .catch((err) => console.error(err));
          }
        }
      } */
    });
    if (manual) {
      resolve(true);
    }
    const chunk = 10;
    for (var i = 0; i < inventoriesProducts.length; i += chunk) {
      var temporary = inventoriesProducts.slice(i, i + chunk);
        syncBulkInventory(temporary, null);
        if (inventoriesProducts.length-1 == i) {
          setTimeout(() => resolve(true), 60000);
        }
    }

    /* chunk = 50;
    for (i = 0,j = inventoriesVariants.length; i < j; i += chunk) {
        temporary = inventoriesVariants.slice(i, i + chunk);
        syncBulkInventory(null, temporary);
        if (i == j-1) {
          console.log("Proccess finished");
        }
    } */
  }
  
  return new Promise(resolve => {
    getData(0, resolve)
  })
}

async function syncQuantityBreaks(manual) {
  var products = [];
  var products2Delete = [];
  var bulkPricingList = [];
  await productsBulkPricingListRef.once("value", snapshot => bulkPricingList = snapshot.val());
  if (typeof bulkPricingList == 'string') bulkPricingList = [];
  bulkPricingList = bulkPricingList.map(x => x.sku);

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);

  async function getData(skip, resolve) {
    var items = await requestSAP.getSpecialPrices("Valid%20eq%20%27tYES%27%20and%20PriceListNum%20eq%206", skip);
    items = JSON.parse(items);
    items.value.forEach(item => {
      //if (item.ItemCode == "56-007") console.log(item.SpecialPriceDataAreas[0].SpecialPriceQuantityAreas);
      products.push({
        sku: item.ItemCode,
        currency: "usd",
        "special_prices": item.SpecialPriceDataAreas[0].SpecialPriceQuantityAreas,
        "bulk_pricing_tiers": []
      });
    });
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getData(skip, resolve);
    } else {
      products.forEach(product => {
        var rules = product.special_prices;
        rules.forEach((rule, i) => {
          product.bulk_pricing_tiers.push({
            "quantity_min": rule.Quantity,
            "quantity_max": ((i < rules.length - 1) ? (product.special_prices[i+1].Quantity) - 1 : 0),
            "type": "fixed",
            "amount": rule.SpecialPrice
          });
        });
        delete product.special_prices
      });

      const p = products.map(x => x.sku);
      bulkPricingList.forEach(item => {
        if (!p.includes(item)) {
            products2Delete.push({
              bulk_pricing_tiers: [],
              //sku: item
            });
        }
      })

      products = products.concat(products2Delete);
      productsBulkPricingListRef.set(products);
      //console.log(products);
      
      if (manual) {
        resolve(true)
      }
      
      setBulkPricingTiers(1, products);
    }
  }

  return new Promise(resolve => {
    getData(0, resolve);
  })
}

async function syncMetafields() {
  var products = [];

  const session = await sapLogin();
  var requestSAP = new RequestSAP(session);

  async function getData(skip) {
    const bigCommerceItems = Object.values(require(path.join(__dirname + '/data/items-by-sku.json')));
    var items = await requestSAP.getItems("ItemCode,U_Carton_Length,U_Carton_Width,U_Carton_Height,U_Carton_Weight,U_hedel_Pack_Multiples,U_hedel_mfr_packing,U_hedel_pack,Valid", filtersForSAP, skip);
    items = JSON.parse(items);
    items.value.forEach((item, i) => {
      if (typeof bigCommerceItems.find(x => x.sku == sku) == 'undefined') {
        //console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
      } else {
        products.push({
          sku: item.ItemCode,
          metafields: [{
          "permission_set": "read_and_sf_access",
          "namespace": "sap",
          "key": "master_case",
          "value": (item.U_hedel_mfr_packing == null) ? "1" : String(item.U_hedel_mfr_packing),
          "description": "Master Case"
        },{
          "permission_set": "read_and_sf_access",
          "namespace": "sap",
          "key": "inner_case",
          "value": (item.U_hedel_pack == null) ? "1" : String(item.U_hedel_pack),
          "description": "Inner Case"
        },
            {
          "permission_set": "read_and_sf_access",
          "namespace": "sap",
          "key": "pack_multiples",
          "value": (item.U_hedel_Pack_Multiples == null) ? "1" : String(item.U_hedel_Pack_Multiples),
          "description": "Pack Multiples"
        },
            {
          "permission_set": "read_and_sf_access",
          "namespace": "sap",
          "key": "carton_length",
          "value": (item.U_Carton_Length == null) ? "1" : String(item.U_Carton_Length),
          "description": "Carton Length"
        },
            {
          "permission_set": "read_and_sf_access",
          "namespace": "sap",
          "key": "carton_width",
          "value": (item.U_Carton_Width == null) ? "1" : String(item.U_Carton_Width),
          "description": "Carton width"
        },
            {
          "permission_set": "read_and_sf_access",
          "namespace": "sap",
          "key": "carton_height",
          "value": (item.U_Carton_Height == null) ? "1" : String(item.U_Carton_Height),
          "description": "Carton Height"
        },
            {
          "permission_set": "read_and_sf_access",
          "namespace": "sap",
          "key": "carton_weight",
          "value": (item.U_Carton_Weight == null) ? "1" : String(item.U_Carton_Weight),
          "description": "Carton Height"
        }
          ]
        });
      }
    });
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getData(skip);
    } else {
      console.log(products.length);
      products.forEach((item, i) => {
        if (bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_product_metafields") && bigCommerceItems[item.sku].bigcommerce_product_metafields.length > 0 || bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_variant_metafields") && bigCommerceItems[item.sku].bigcommerce_variant_metafields.length > 0) {
          if (bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_variant_metafields")) {
            item.metafields.forEach((metafield, i) => {
              var id = bigCommerceItems[item.sku].bigcommerce_variant_metafields.filter(function(item) { return item.key === metafield.key; });
              if (typeof id[0] != 'undefined') {
                bigCommerce.put(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/variants/${bigCommerceItems[item.sku].bigcommerce_variant_id}/metafields/${id[0].id}`, metafield)
                .then(data => {
                  //console.log(data);
                })
                .catch((err) => console.error(err));
              }
            });
          } else {
            item.metafields.forEach((metafield, i) => {
              var id = bigCommerceItems[item.sku].bigcommerce_product_metafields.filter(function(item) { return item.key === metafield.key; });
              if (typeof id[0] != 'undefined') {
                bigCommerce.put(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/metafields/${id[0].id}`, metafield)
                .then(data => {
                  //console.log(data);
                })
                .catch((err) => console.error(err));
                
                if (metafield.key == "pack_multiples") {
                  bigCommerce.put(`/catalog/products/${ bigCommerceItems[item.sku].bigcommerce_product_id }`, { "order_quantity_minimum": metafield.value })
                    .then(data => {
                      // Catch any errors, or handle the data returned
                      console.log(data.data.sku + " Metafield Updated");
                      if (data.data.sku == "011-396") {
                        console.log("Aqui está \n");
                      }
                    })
                    .catch((err) => console.error(err));
                }
              }
            });
          }
        } else {
          if (bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_variant_id")) {
            item.metafields.forEach((metafield, i) => {
              bigCommerce.post(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/variants/${bigCommerceItems[item.sku].bigcommerce_variant_id}/metafields`, metafield)
              .then(data => {
                //console.log(data);
              })
              .catch((err) => console.error(err));
            });
          } else {  
            item.metafields.forEach((metafield, i) => {
              bigCommerce.post(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/metafields`, metafield)
              .then(data => {
                //console.log(data);
              })
              .catch((err) => console.error(err));      

              if (metafield.key == "pack_multiples") {
                bigCommerce.put(`/catalog/products/${ bigCommerceItems[item.sku].bigcommerce_product_id }`, { "order_quantity_minimum": metafield.value })
                  .then(data => {
                    // Catch any errors, or handle the data returned
                    console.log(data.data.sku + " Variant Metafield Updated");
                  })
                  .catch((err) => console.error(err));
              }
            });
          }
        } 
      });
    }
  }

  try {
    await getData(0);
  } catch (e) {
  e.message === 'HTTP request failed'
    ? console.error(JSON.stringify(e.response, null, 2))
    : console.error(e)
  }
}

function syncBulkInventory(products, variants) {
  if (products != null) {
    bigCommerce.put('/catalog/products', products)
    .then(data => console.log(products.length + " Products Updated Successfully => Inventory"))
    .catch((err) => {
      if (err.code == 500) {
        setTimeout(()=> syncBulkInventory(products), 15000);
      } else {
        console.error(err)
      }
    });
  }
  if (variants != null) {
    bigCommerce.put('/catalog/variants', variants)
    .then(data => {
      console.log(variants.length + " Variants Updated Successfully => Inventory");
    })
    .catch((err) => {
      if (err.code == 500) {
        setTimeout(()=> syncBulkInventory(variants), 15000);
      } else {
        console.error(err)
      }
    });
  }
}

function syncBulkPrices(prices) {
  bigCommerce.put('/catalog/products', prices)
    .then(data => {
      // Catch any errors, or handle the data returned
      console.log(data);
    })
    .catch((err) => console.error(err));
}

function setBulkPricingTiers(priceList, body) {
  bigCommerce.put(`/pricelists/${ priceList }/records`, body)
    .then(data => {
      // Catch any errors, or handle the data returned
      console.log(data);
    })
    .catch((err) => console.error(err));
}

function updateBatchProducts(body) {
  bigCommerce.put(`/catalog/products`, body)
    .then(data => {
      if (Object.keys(data).length > 0) {
        console.log("Successful Update");
      }
    })
    .catch((err) => {
      if (err.code == 500) {
        setTimeout(()=> updateBatchProducts(body), 15000);
      } else {
        console.error(err)
        console.error(body)
      }
    });
}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

async function sinctronizarItems(idCol, cat) {
  var variants = [];
  getProducts("");
  function getProducts(after) {
    var queries = [];
    const query = `{
      collection(id: "gid://shopify/Collection/${ idCol }") {
        products(first:10 ${ after }) {
          edges {
            cursor
            node {
              id
              title
              descriptionHtml
              vendor
              productType
              tags
              featuredImage {
                originalSrc
                altText
              }
              images(first:10) {
                edges {
                  node {
                    originalSrc
                    altText
                  }
                }
              }
              variants(first:20) {
                edges {
                  node {
                    id
                    title
                    price
                    barcode
                    sku
                    weight
                    displayName
                    selectedOptions {
                      name
                      value
                    }
                    image {
                      originalSrc
                      altText
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    }`;

    shopify
      .graphql(query)
      .then((response) => {
        console.log("Getting", response.collection.products.edges.length);
        let categories = [ cat ];
        response.collection.products.edges.forEach((item, i) => {
          console.log(item.node.id);
          if (item.node.variants.edges.length > 1) {
            item.node.variants.edges.forEach((variant, i) => {
              queries.push({
                "name": variant.node.displayName,
                "sku": variant.node.sku,
                "price": variant.node.price,
                "desc_long": "",
                "category_ids": [ cat ],
                "weight": variant.node.weight,
                "upc": variant.node.barcode,
                "brand": item.node.vendor
              });
              //console.log(variant);
              //console.log(variant.node.selectedOptions);
            });
          } else {
            queries.push({
              "name": item.node.title,
              "sku": item.node.variants.edges[0].node.sku,
              "price": item.node.variants.edges[0].node.price,
              "desc_long": item.node.descriptionHtml,
              "category_ids": [ cat ],
              "weight": item.node.variants.edges[0].node.weight,
              "upc": item.node.variants.edges[0].node.barcode,
              "brand": item.node.vendor
            });
          }
        });
        sleep(2000);
        createItem(0);
        async function createItem(i) {
          var item = queries[i];
          sleep(2000);
          console.log("index:", i + " de " + (queries.length - 1));
          console.log("SKU:" + item.sku + " => " + item.name);
          var itemsSKU = require(path.join(__dirname + '/data/items-by-sku-jasper.json'));
          var brands = require(path.join(__dirname + '/data/brands.json'));
          var brandId = brands.brands.filter(function(brand) { return brand.name === item.brand; });
          if (typeof itemsSKU[item.sku] === 'undefined') {
            var req = await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "name": item.name,
              "sku": item.sku,
              "enabled": 1,
              "is_visible": 1,
              "desc_long": item.desc_long,
              "category_ids": [ 22 ],
              "brand_id": brandId[0].id
            })
            var id = JSON.parse(req).product.id;
            await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/prices", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "sell_price": item.price,
              "base" : "USD",
              "from": new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
            })
            await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/inventory", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "product_id": id,
              "count_on_hand": 75,
              "location": "MIAMI"
            })
            await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/assets", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "image_url": "https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/" + item.sku + ".png",
              "thumbnail" : 1
            })

            itemsSKU[item.sku] = { "jasper_id": id };
            fs.writeFileSync(path.join(__dirname + '/data/items-by-sku-jasper.json'), JSON.stringify(itemsSKU));
            createImages(2);
            async function createImages(j) {
              await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/assets", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
                "image_url": "https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/" + item.sku + "." + j + ".png",
                "thumbnail" : 0
              })
              if (j < 10) {
                createImages(j+1);
              }
            }
          }

          if (i < queries.length - 1) {
            createItem(i+1);
          }
          else {
            if (response.collection.products.pageInfo.hasNextPage) {
              //console.log("next");
              getProducts('after:"' + response.collection.products.edges[9].cursor + '"');
            }
          }
        };
        console.log("Queries", queries.length);
      })
      .catch((err) => console.error(err));
  }
}

async function sinctronizarItem(idItem, cat) {
  var queries = [];
  getProducts();
  function getProducts() {
    const query = `{
      product(id: "gid://shopify/Product/${ idItem }") {
        id
        title
        descriptionHtml
        vendor
        productType
        tags
        featuredImage {
          originalSrc
          altText
        }
        images(first:10) {
          edges {
            node {
              originalSrc
              altText
            }
          }
        }
        variants(first:20) {
          edges {
            node {
              id
              title
              price
              barcode
              sku
              weight
              displayName
              selectedOptions {
                name
                value
              }
              image {
                originalSrc
                altText
              }
            }
          }
        }
      }
    }`;

    shopify
      .graphql(query)
      .then((response) => {
        var item = response.product
        var product;
        let categories = [ 41 ];
        if (item.variants.edges.length > 1) {
          item.variants.edges.forEach((variant, i) => {
            queries.push({
              "name": variant.node.displayName,
              "sku": variant.node.sku,
              "price": variant.node.price,
              "desc_long": "",
              "category_ids": [ cat ],
              "weight": variant.node.weight,
              "upc": variant.node.barcode,
              "brand": item.vendor
            });
            //console.log(variant);
            //console.log(variant.node.selectedOptions);
          });
        } else {
          queries.push({
            "name": item.title,
            "sku": item.variants.edges[0].node.sku,
            "price": item.variants.edges[0].node.price,
            "desc_long": item.descriptionHtml,
            "category_ids": [ cat ],
            "weight": item.variants.edges[0].node.weight,
            "upc": item.variants.edges[0].node.barcode,
            "brand": item.vendor
          });
        }
        createItem(0);
        async function createItem(i) {
          var item = queries[i];
          console.log("SKU:" + item.sku + " => " + item.name);
          var itemsSKU = require(path.join(__dirname + '/data/items-by-sku-jasper.json'));
          var brands = require(path.join(__dirname + '/data/brands.json'));
          var brandId = brands.brands.filter(function(brand) { return brand.name === item.brand; });
          if (typeof itemsSKU[item.sku] === 'undefined') {
            var req = await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "name": item.name,
              "sku": item.sku,
              "enabled": 1,
              "is_visible": 1,
              "desc_long": item.desc_long,
              "category_ids": [ 22 ],
              "brand_id": brandId[0].id
            })
            var id = JSON.parse(req).product.id;
            await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/prices", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "sell_price": item.price,
              "base" : "USD",
              "from": new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
            })
            await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/inventory", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "product_id": id,
              "count_on_hand": 75,
              "location": "MIAMI"
            })
            await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/assets", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
              "image_url": "https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/" + item.sku + ".png",
              "thumbnail" : 1
            })
            itemsSKU[item.sku] = { "jasper_id": id };
            fs.writeFileSync(path.join(__dirname + '/data/items-by-sku-jasper.json'), JSON.stringify(itemsSKU));
            createImages(2);
            async function createImages(j) {
              await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/assets", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
                "image_url": "https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/" + item.sku + "." + j + ".png",
                "thumbnail" : 0
              })
              if (j < 10) {
                createImages(j+1);
              }
            }
          }
          if (i < queries.length) {
            createItem(i+1);
          }
        };
        console.log("Queries", queries.length);
      })
      .catch((err) => console.error(err));
  }
}

async function sincronizarItemFromSAP(sku) {
  try {
    var item = {};
    const session = await sapLogin();
    var requestSAP = new RequestSAP(session);
    async function getData() {
      //console.log(jsonData);
      var items = await requestSAP.getItem(sku);
      console.log(items);
      items = JSON.parse(items);
      item = {
        "name": items.ItemName,
        "sku": items.ItemCode,
        "price": items.ItemPrices[1].Price
      };
    }
    async function createItem() {
      console.log("SKU:" + item.sku + " => " + item.name);
      var brands = require(path.join(__dirname + '/data/brands.json'));
      var brandId = brands.brands.filter(function(brand) { return brand.name === item.brand; });
      var req = await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
        "name": item.name,
        "sku": item.sku,
        "enabled": 1,
        "is_visible": 1
      })
      var id = JSON.parse(req).product.id;
      await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/prices", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
        "sell_price": (item.price < 0.01) ? 75 : item.price,
        "base" : "USD",
        "from": new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
      })
      await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/inventory", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
        "product_id": id,
        "count_on_hand": 75,
        "location": "MIAMI"
      })
      await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/assets", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
        "image_url": "https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/" + item.sku + ".png",
        "thumbnail" : 1
      })
      createImages(2);
      async function createImages(j) {
        await sendPOSTPromised(process.env.JASPER_API_DOMAIN, "/api/v1/products/" + id + "/assets", {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN}, {
          "image_url": "https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/" + item.sku + "." + j + ".png",
          "thumbnail" : 0
        })
        if (j < 10) {
          createImages(j+1);
        }
      }
    };
    await getData();
    //await createItem();
  } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e)
  }
}

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

//Classes
class RequestSAP {
  constructor(session) {
    this.session = session;
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

fs.watchFile(path.join(__dirname + '/data/items-by-sku.json'), (curr, prev) => {
  client.messages.create({ body: "File Modified", from: process.env.SMS_SENDER, to: process.env.DEVELOPER_NUMBER });
  console.log(`the current mtime is: ${curr.mtime}`);
  console.log(`the previous mtime was: ${prev.mtime}`);
});



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
          VALUES (${item.id}, '${item.name}', 1, 1, 1, '${item.sku}', ${(item.is_bundle == 0) ? false : true}, '${JSON.stringify(item.categories.map(x => x.id))}', ${(item.is_visible == 0) ? false : true}, ${(item.enabled == 0) ? false : true}, '${(typeof item.desc_short != 'undefined') ? item.desc_short : ''}', '${(typeof item.desc_long != 'undefined') ? item.desc_long : ''}', '', '', '${now.toISOString()}', '${now.toISOString()}', ${(item.featured == 0) ? false : true}, ${(item.barcodes.length > 0) ? "'{ type: " +  '"UPC-A"' + ", barcode: " + item.barcodes[0].barcode + "}'" : "'{}'"}, '', '', '', '', '', '', '', '', '');`;
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
    var items = await requestSAP.getItems("ItemCode,U_Catalog_Main_Category,U_Catalog_Sub_Category,U_Catalog_Main_Category_SP,U_Catalog_Sub_Cat_SP,U_Master_Family,U_Master_Family_ES", filtersForSAP, skip);
    items = JSON.parse(items);
    products = products.concat(items.value);
    if (items.hasOwnProperty('odata.nextLink')) {
      skip += 20;
      console.log(skip);
      getData(skip, resolve);
    } else {
      products.forEach(async item => {
        const text = `UPDATE products
        SET catalog_main_family_en = '${(item.U_Master_Family) ? item.U_Master_Family : ''}' 
        WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET catalog_main_family_es = '${(item.U_Master_Family_ES) ? item.U_Master_Family_ES : ''}' 
        WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET catalog_main_category_en = '${(item.U_Catalog_Main_Category) ? item.U_Catalog_Main_Category : ''}' 
        WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET catalog_main_category_es = '${(item.U_Catalog_Main_Category_SP) ? item.U_Catalog_Main_Category_SP : ''}' 
        WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET catalog_subcategory_en = '${(item.U_Catalog_Sub_Category) ? item.U_Catalog_Sub_Category : ''}' 
        WHERE sku = '${item.ItemCode}';
        UPDATE products
        SET catalog_subcategory_es = '${(item.U_Catalog_Sub_Cat_SP) ? item.U_Catalog_Sub_Cat_SP : ''}' 
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

getFromSAP()