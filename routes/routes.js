const express = require('express')
const path = require('path')
const ipapi = require('ipapi.co')

const app = express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(express.json())
  .use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', "Origin, -X-Requested-With, Content-Type, Accept, x-xsrf-token");
    next();
  })
  /* .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs') */
  
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
  .get('/products/:id', async (req, res) => {
    const id = req.params.id;

    if(req.query.debug && req.query.debug == 'promos') {
      const promosData = fs.readFileSync(path.join(__dirname + '/data/promo-products.json'));
      res.send(JSON.parse(promosData));
    } else {    
      const response = await getPromos();
      res.render('public/pim.html')
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
  .get('/pim/products', async (req, res) => {
    const products = await getDataFromTable('products', 20, 1)
    const brands = await getDataFromTable('brands', 20, 1)
    console.log("brand:", brands[0]);
    const response = products.map(product => {
        return {
          asset_thumbnail: product.asset_thumbnail, 
          sku: product.sku, 
          name: product.name, 
          enabled: product.enabled, 
          inventory: product.inventory, 
          price: product.price, 
          brand: product.brand_id 
        }
      });
    console.log(response[0]);
    res.json(products);
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

  module.exports = app;