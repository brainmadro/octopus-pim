const { pool } = require('./utilsDatabase')


pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

async function getAllProducts(limit, page) {
	try {
		const client = await pool.connect()
		//console.log('Database Connected')		
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT ${process.env.DB_PRODUCTS_TABLE}.*, ${process.env.DB_BRANDS_TABLE}.name AS brand, ${process.env.DB_ASSETS_TABLE}.uri AS uri FROM ${process.env.DB_PRODUCTS_TABLE} 
			INNER JOIN ${process.env.DB_BRANDS_TABLE} ON brand_id = ${process.env.DB_BRANDS_TABLE}.id 
			INNER JOIN ${process.env.DB_ASSETS_TABLE} ON asset_thumbnail = ${process.env.DB_ASSETS_TABLE}.id
			LIMIT ${limit} OFFSET ${limit*(page - 1)}`
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
				pagination: {
					current: {
						limit: limit,
						page
					},
					next: {
						limit: limit,
						page: page+1
					},
					prev: (page-1 > 0) ? {
						limit: limit,
						page: page-1
					} : null
				}				
			}
		}
	} catch (error) {
		console.log('Database error:', error.stack)
	}
}

async function getProductBySKU(sku) {
	try {
		const data = {}
		const client = await pool.connect()
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT ${process.env.DB_PRODUCTS_TABLE}.*, ${process.env.DB_BRANDS_TABLE}.name AS brand, ${process.env.DB_ASSETS_TABLE}.uri AS uri FROM ${process.env.DB_PRODUCTS_TABLE} 
			INNER JOIN ${process.env.DB_BRANDS_TABLE} ON brand_id = ${process.env.DB_BRANDS_TABLE}.id 
			INNER JOIN ${process.env.DB_ASSETS_TABLE} ON asset_thumbnail = ${process.env.DB_ASSETS_TABLE}.id
			WHERE ${process.env.DB_PRODUCTS_TABLE}.sku = '${sku}'`
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

async function getProductById(id) {
	try {
		const data = {}
		const client = await pool.connect()
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT ${process.env.DB_PRODUCTS_TABLE}.*, ${process.env.DB_BRANDS_TABLE}.name AS brand, ${process.env.DB_ASSETS_TABLE}.uri AS uri FROM ${process.env.DB_PRODUCTS_TABLE} 
			INNER JOIN ${process.env.DB_BRANDS_TABLE} ON brand_id = ${process.env.DB_BRANDS_TABLE}.id 
			INNER JOIN ${process.env.DB_ASSETS_TABLE} ON asset_thumbnail = ${process.env.DB_ASSETS_TABLE}.id
			WHERE ${process.env.DB_PRODUCTS_TABLE}.id = '${id}'`
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

async function findProduct(ref, limit, page) {
	try {
		const client = await pool.connect()
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT ${process.env.DB_PRODUCTS_TABLE}.*, ${process.env.DB_BRANDS_TABLE}.name AS brand, ${process.env.DB_ASSETS_TABLE}.uri AS uri FROM ${process.env.DB_PRODUCTS_TABLE} 
			INNER JOIN ${process.env.DB_BRANDS_TABLE} ON brand_id = ${process.env.DB_BRANDS_TABLE}.id 
			INNER JOIN ${process.env.DB_ASSETS_TABLE} ON asset_thumbnail = ${process.env.DB_ASSETS_TABLE}.id
			WHERE ${process.env.DB_PRODUCTS_TABLE}.sku = '${ref}' OR ${process.env.DB_PRODUCTS_TABLE}.id = '${ref}'
			LIMIT ${limit} OFFSET ${limit*(page - 1)}`
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
				pagination: {
					current: {
						limit: limit,
						page
					},
					next: {
						limit: limit,
						page: page+1
					},
					prev: (page-1 > 0) ? {
						limit: limit,
						page: page-1
					} : null
				}				
			}
		}
	} catch (error) {
		console.log('Database error:', error.stack)
	}
}

/* pool.query('SELECT NOW()', (err, res) => {
	console.log(err, res)
	pool.end()
}) */
  
/* pool.connect((err, client, done) => {
	if (err) throw err

	client.query('SELECT * FROM products', (err, res) => {
		done()
		if (err) throw `Query error: ${err}`
		console.log(res.rows[0])
	})
}) */

//INNER JOIN brands ON brand_id = brands.id INNER JOIN assets ON asset_thumbnail = assets.id

module.exports = {
	getAllProducts,
	getProductBySKU,
	getProductById,
	findProduct
}