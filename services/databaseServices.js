const { getAllProducts, getProductBySKU, getProductById, findProduct } = require('../data/Product')
const { getAllBrands, getBrandById } = require('../data/Brand')
const { getAllCategories, getProductCategories } = require('../data/Category')
const { getAllProductAssets, getAssetById, getAllAssetsFiltered } = require('../data/Asset')
const { getAllAttributesSets, getAttributesSetsById, getAllProductAttributeSets, getAllAttributesSetsFiltered } = require('../data/AttributesSets')
const { getProductInventory } = require('../data/Inventory')
const { getProductPrices } = require('../data/Price')
const { getAllCustomFieldsFiltered } = require('../data/CustomFields')
const { getAllRelationsFiltered } = require('../data/ProductRelations')
const { customQuery } = require('../data/utilsDatabase')

async function getDataFromTable(table, limit = 20, page = 1) {
	switch (table) {
		case process.env.DB_PRODUCTS_TABLE:
			return getAllProducts(limit, page)

		case process.env.DB_BRANDS_TABLE:
			return getAllBrands(limit, page)
	
		default:
			throw 'Table not found'
	}
	
}

async function customQueryDB(query) {
	return await customQuery(query)
}

async function getAllAssetsFilteredById () {
	filters = filters.split(',').reduce((acc, cur) => `${acc} id=${cur} OR`, ``)
	filters = filters.slice(0, -3)
	return await getAllAssetsFiltered(filters, "limit", "page")
}

async function getAllAttributesSetsFilteredById (filters) {
	filters = filters.split(',').reduce((acc, cur) => `${acc} id=${cur} OR`, ``)
	filters = filters.slice(0, -3)
	return await getAllAttributesSetsFiltered(filters, "limit", "page")
}

async function getAllCustomFieldsFilteredById (filters) {
	filters = filters.split(',').reduce((acc, cur) => `${acc} id=${cur} OR`, ``)
	filters = filters.slice(0, -3)
	return await getAllCustomFieldsFiltered(filters, "limit", "page")
}

async function getAllProductRelationsFilteredById (filters) {
	filters = filters.split(',').reduce((acc, cur) => `${acc} id=${cur} OR`, ``)
	filters = filters.slice(0, -3)
	return await getAllRelationsFiltered(filters, "limit", "page")
}

module.exports = { 
	customQuery: customQueryDB,
	findProduct,
	getDataFromTable,
	getProductBySKU,
	getProductById,
	getBrandById,
	getAllProductAssets,
	getAssetById,
	getAllAssetsFilteredById,
	getAllAttributesSetsFilteredById,
	getAllProductAttributeSets,
	getAllCategories,
	getProductCategories,
	getProductInventory,
	getProductPrices,
	getAllCustomFieldsFilteredById,
	getAllProductRelationsFilteredById
}