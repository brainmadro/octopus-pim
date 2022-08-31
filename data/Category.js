const { pool } = require('./utilsDatabase')


pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

async function getAllCategories(limit, page) {
	try {
		const client = await pool.connect()
		//console.log('Database Connected')		
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_CATEGORIES_TABLE} LIMIT ${limit} OFFSET ${limit*(page - 1)}`
		})
		await client.end()
		const data = result.rows.reduce((acc, cur) => {
			let properties = {};
			cur.forEach((element, index) => {
				properties[result.fields[index].name] = element
			}) 
			acc.push(properties)
			return acc
		}, [])
		return { 
			data: data,
			meta: {
				next: `link?page=${page+1}`
			}
		}
	} catch (error) {
		console.log('Database error:', error.stack)
	}
}

async function getProductCategories(sku) {
	try {
		const client = await pool.connect()
		const categories = await client.query({
			rowMode: 'array',
			text: `SELECT category_ids FROM ${process.env.DB_PRODUCTS_TABLE} WHERE sku = '${sku}'`
		})
		const ids = categories.rows[0][0].reduce((acc, cur) => `${acc} id=${cur} OR`, ``).slice(0, -3)
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_CATEGORIES_TABLE} WHERE${ids}`
		})
		await client.end()
		const data = result.rows.map(x => {
			let attribute = {}
			x.forEach((element, index) => {
				attribute[result.fields[index].name] = element
			})
			return attribute
		})
		return { data: data }
	} catch (error) {
		console.log('Database error:', error.stack)
	}
}

module.exports = {
	getAllCategories,
	getProductCategories
}