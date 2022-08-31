async function sendGETRequest(url) {
	const res = await fetch(url)
	.then(response => response.json())
	.finally(response => {
		return response
	})
	return res
}

async function getAll(limit, page) {
	const res = await sendGETRequest(`http://localhost:5000/pim/v1/products?limit=${limit}&page=${page}`)
	console.log(res);
	return res
}

async function find(ref, limit, page) {
	const res = await sendGETRequest(`http://localhost:5000/pim/v1/products/find?ref=${ref}&limit=${limit}&page=${page}`)
	console.log(res);
	return res
}

async function getSingleProduct(id) {
	const res = await sendGETRequest(`http://localhost:5000/pim/v1/products/${id}`)
	console.log(res);
	return res
}

async function getProductAssets(id) {
	const res = await sendGETRequest(`http://localhost:5000/pim/v1/products/${id}`)
	console.log(res);
	return res
}

const utils = {
	api: {
		product: {
			getAll,
			getSingleProduct,
			find
		}
	}
}

export default utils;