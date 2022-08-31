const { pool } = require('./utilsDatabase')


pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

async function getAllCustomFieldsFiltered(filter, limit, page) { // Only filter available right now is "id"
	try {
		const client = await pool.connect()
		const result = await client.query({
			rowMode: 'array',
			text: `SELECT * FROM ${process.env.DB_CUSTOM_FIELDS_TABLE} WHERE${filter}`
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

module.exports = {
	getAllCustomFieldsFiltered
}

/*
[
	{
		"custom_fields": {
			"set_id": 1,
			"fields": [ 1, 2, 3, 4]
		}
	},
	{
		"custom_fields": {
			"fields": [ "slug1", "slug2", "slug3", "slug4"]
		}
	},
	{
		//dependiendo del tipo que seas el json cambia
	}
]
*/