const { pool } = require('./utilsDatabase')


pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

async function getProductPrices(sku) {
	try {
		const page =''
		const client = await pool.connect()
		//console.log('Database Connected')		
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_PRICES_TABLE} WHERE sku='${sku}'`
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

/*
discount json
{
	"type": "percent",
	"value": 20.00
}
*/

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
	getProductPrices
}