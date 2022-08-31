const { pool } = require('./utilsDatabase')


pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

async function getAllAttributesSets() {
	try {
		const client = await pool.connect()
		//console.log('Database Connected')		
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_ATTRIBUTE_SETS_TABLE}`
		})
		await client.end()
		return result.rows	
	} catch (error) {
		console.log('Database connection error:', error.stack)
	}
}

async function getAllProductAttributeSets(sku) {
	try {
		const client = await pool.connect()
		const id = await client.query({
			rowMode: 'array',
			text: `SELECT id FROM ${process.env.DB_PRODUCTS_TABLE} WHERE sku = '${sku}'`
		})
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_ATTRIBUTES_TABLE} WHERE product_id = ${id.rows[0][0]}`
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

async function getAttributesSetsById(id) {
	try {
		const data = {}
		const client = await pool.connect()
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_ATTRIBUTE_SETS_TABLE} WHERE id = '${id}'`
		})
		await client.end()
		result.rows[0].forEach((element, index) => {
			data[result.fields[index].name] = element
		}) 
		return { data: data }
	} catch (error) {
		console.log('Database error:', error.stack)
	}
}

async function getAllAttributesSetsFiltered(filter, limit, page) { // Only filter available right now is "id"
	try {
		const client = await pool.connect()
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_ATTRIBUTE_SETS_TABLE} WHERE${filter}`
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
		console.log('Database connection error:', error.stack)
	}
}

module.exports = {
	getAllAttributesSets,
	getAttributesSetsById,
	getAllProductAttributeSets,
	getAllAttributesSetsFiltered
}