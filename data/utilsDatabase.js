
const { Pool, Client } = require('pg');

const config = ({
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	host: process.env.PGHOST,
	port: process.env.PGPORT,
	database: process.env.PGDATABASE,
	ssl: { rejectUnauthorized: false }
});

const pool = new Pool(config)

async function customQuery(query) {
	try {
		const client = await pool.connect()
		const result = await client.query({
			rowMode: 'array',
			text: query
		})
		await client.end()
		return result
	} catch (error) {
		console.log('Database error:', error.stack)
		return error.stack
	}
}

module.exports = { 
	customQuery,
	pool
 }