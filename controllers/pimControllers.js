const databaseServices = require('../services/databaseServices')

const brands = async (req, res) => {
    const products = await databaseServices.getDataFromTable(process.env.DB_BRANDS_TABLE, 20, 1)
	/* const brands = await getDataFromTable('brands', 20, 1)
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
	}); */
	res.statusCode(500)
	//res.send(products.length)
}

const products = async (req, res) => {
	const limit = (req.query.limit) ? parseInt(req.query.limit) : 20 ;
	const page = (req.query.page) ? parseInt(req.query.page) : 1 ;
    const products = await databaseServices.getDataFromTable(process.env.DB_PRODUCTS_TABLE, limit, page)
	for (const iterator of products.data) {
		//console.log(iterator);
		iterator['asset_thumbnail'] = iterator.uri
	}
	
	/* const response = products.map(product => {
		return {
			asset_thumbnail: product.asset_thumbnail, 
			sku: product.sku, 
			name: product.name, 
			enabled: product.enabled, 
			inventory: product.inventory, 
			price: product.price, 
			brand: product.brand_id 
		}
	}); */
	//res.sendStatus(500)
	res.send(products)
}

const singleProduct = async (req, res) => {
	const product = await databaseServices.getProductById(req.params.id)
	//res.sendStatus(500)
	//await databaseServices.getAllAssetsFilteredById();
	product.data['asset_thumbnail'] = product.data.uri
	res.send(product.data)
}

const findProduct = async (req, res) => {
	const product = await databaseServices.findProduct(req.query.ref, 20, 1)
	//res.sendStatus(500)
	//await databaseServices.getAllAssetsFilteredById();
	/* for (const iterator of products.data) {
		//console.log(iterator);
		iterator['asset_thumbnail'] = iterator.uri
	} */
	product.data['asset_thumbnail'] = product.data.uri
	res.send(product)
}

const assetsFiltered = async (req, res) => {
	const filter = req.query.filter;
	if (typeof filter != 'undefined' && filter.startsWith('ids:')) {
		const assets = await databaseServices.getAllAssetsFilteredById(filter.replace('ids:', ''))
		console.log(assets);
		res.sendStatus(200)
	} else {
		res.sendStatus(400)
	}
}

const productAssets = async (req, res) => {
	const id = req.params.id;
	if (typeof sku != 'undefined') {
		const assets = await databaseServices.getAllProductAssets(id)
		res.send(assets)
	} else {
		res.sendStatus(400)
	}
}

const attribureSetsFiltered = async (req, res) => {
	const filter = req.query.filter;
	if (typeof filter != 'undefined' && filter.startsWith('ids:')) {
		const attributeSets = await databaseServices.getAllAttributesSetsFilteredById(filter.replace('ids:', ''))
		res.send(attributeSets)
	} else {
		res.sendStatus(400)
	}
}

const productAttribureSets = async (req, res) => {
	const sku = req.params.sku;
	if (sku == 'undefined') res.sendStatus(400)
	const attributeSets = await databaseServices.getAllProductAttributeSets(sku)
	res.send(attributeSets)
}

const productCategories = async (req, res) => {
	const sku = req.params.sku;
	if (sku == 'undefined') res.sendStatus(400)
	const categories = await databaseServices.getProductCategories(sku)
	res.send(categories)
}

const productInventory = async (req, res) => {
	const sku = req.params.sku;
	if (sku == 'undefined') res.sendStatus(400)
	const inventory = await databaseServices.getProductInventory(sku)
	res.send(inventory)
}

const productPrices = async (req, res) => {
	const sku = req.params.sku;
	if (sku == 'undefined') res.sendStatus(400)
	const prices = await databaseServices.getProductPrices(sku)
	res.send(prices)
}

const productCustomFields = async (req, res) => {
	const filter = req.query.filter;
	if (typeof filter != 'undefined' && filter.startsWith('ids:')) {
		const customFields = await databaseServices.getAllCustomFieldsFilteredById(filter.replace('ids:', ''))
		res.send(customFields)
	} else {
		res.sendStatus(400)
	}
}

const productRelations = async (req, res) => {
	const filter = req.query.filter;
	if (typeof filter != 'undefined' && filter.startsWith('ids:')) {
		const relations = await databaseServices.getAllProductRelationsFilteredById(filter.replace('ids:', ''))
		res.send(relations)
	} else {
		res.sendStatus(400)
	}
}

const customQuery = async (req, res) => {
	//console.log('/custom-query');
	res.send(await databaseServices.customQuery(req.body.query))
}

module.exports = {
	assetsFiltered,
	attribureSetsFiltered,
	brands,
	customQuery,
	findProduct,
	products,
	productAssets,
	productAttribureSets,
	productCategories,
	productInventory,
	productPrices,
	productCustomFields,
	productRelations,
	singleProduct
}