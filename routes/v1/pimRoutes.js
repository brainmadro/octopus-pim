const router = require('express').Router()
const pimControllers = require('../../controllers/pimControllers')

router.get('/products', pimControllers.products)
router.get('/products/find', pimControllers.findProduct)
router.get('/products/:id', pimControllers.singleProduct)
router.get('/products/:id/assets', pimControllers.productAssets)
router.get('/products/:sku/attributes-sets', pimControllers.productAttribureSets)
router.get('/products/:sku/categories', pimControllers.productCategories)
router.get('/products/:sku/inventory', pimControllers.productInventory)
router.get('/products/:sku/prices', pimControllers.productPrices)
router.get('/products/:sku/custom-fields', pimControllers.productCustomFields)
router.get('/products/:sku/relations', pimControllers.productRelations)
//router.get('/assets', pimControllers.assets)
//router.get('/attributes-sets', pimControllers.attribureSets)
router.get('/brands', pimControllers.brands)
router.post('/custom-query', pimControllers.customQuery)

/* router.get('/viewed-products', async (req, res) => {
	const viewedProducts = await getViewedProducts();
	res.setHeader('Content-Type', 'application/json')
	res.send(JSON.stringify(viewedProducts))
})

	
router.post('/promos-add-product', async (req, res) => {
    console.log(req.body);
    const response = await addProductPromo(req.body.sku, req.body.type);
    res.send(response);
})
router.post('/promos-remove-product', async (req, res) => {
    console.log(req.body);
    const response = await removePromoItem(req.body.sku, req.body.type);
    console.log(response);
    res.send({});
})
router.post('/viewed-products/update', async (req, res) =>{
    const id = req.body.id
    const sku = req.body.sku
    const title = req.body.title
    const lastView = req.body.last_view
    await productsViewedRef.orderByChild('sku').equalTo(sku).once('value', snapshot => updateViewedProduct(snapshot, parseInt(id), sku, title, lastView), errorGettingData)
    res.sendStatus(200)
})
		
router.get('/promo-products', async (req, res) => {
    const response = await getPromos();
    res.send(response);
})


router.get('/products-bigcommerce/sku', async (req, res) => {
    const response = await getProductsBigcommerceBySku(req.query.sku);
    res.send(response);
})
router.get('/products-from-bigcommerce', async (req, res) => {
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
router.get('/products-from-jasper', async (req, res) => {
    if(req.query.debug && req.query.debug == 'json') {
      var bigCommerceItems = [];
      await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
      res.send(JSON.parse(bigCommerceItems));
    } else {
      getProductsJasper();
      res.render('pages/index')
    }
})
router.get('/metafields-from-bigcommerce', (req, res) => {
    const index = req.query.index;
    getMetafieldsBigCommerce(index);
    res.render('pages/index');
})
router.get('/metafields/product/:id', (req, res) => {
    var id = req.params.id;
    bigCommerce.get(`/catalog/products/${ id }/metafields`)
      .then(data => {
        // Catch any errors, or handle the data returned
        console.log(data);
        res.send(JSON.stringify(data))
      })
      .catch((err) => console.error(err));
})
router.get('/metafields/product/:product/variant/:variant', (req, res) => {
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

router.get('/products/:id', async (req, res) => {
    const id = req.params.id;

    if(req.query.debug && req.query.debug == 'promos') {
      const promosData = fs.readFileSync(path.join(__dirname + '/data/promo-products.json'));
      res.send(JSON.parse(promosData));
    } else {    
      const response = await getPromos();
      res.render('public/pim.html')
    }
}) */

module.exports = router