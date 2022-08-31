

//Jasper Functions

function getProductsJasper(products) {
	const getData = (page) => {
	  sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products?page=${ page }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
	  .then(response => JSON.parse(response))
	  .then(data => {
		if (data.hasOwnProperty('products')) {
		  const productsJasper = data.products.filter(x => typeof x.sku != 'undefined');
		  productsJasper.forEach(item => {
			if (item.sku != 'undefined') {
			  /* Version Cloud Firestore
			  const cityRef = db.collection('products').doc(item.sku);
			  // Set JasperPIM ID
			  const res = await cityRef.update({ jasper_id: item.id }); */
			  /* const itemRef = productsRef.orderByChild('sku').equalTo(item.sku)
			  itemRef.update({
				'jasper_id': item.id
			  }); */
			  const productData = products.find(x => x.sku == item.sku)
			  if (typeof productData != 'undefined') {
				productData['jasper_id'] = item.id;
				products.splice(products.findIndex(x => x.sku == item.sku), 1, productData);
				console.log(products[products.findIndex(x => x.sku == item.sku)]);
			  }
			}
			
			/* const productData = itemsBySku.find(x => x.sku == item.sku)
			if (typeof productData != 'undefined') {
			  productData['jasper_id'] = item.id;
			  itemsBySku.splice(itemsBySku.findIndex(x => x.sku == item.sku), 1, productData);
			} */
		  });        
		  if (typeof data.links != 'undefined' && typeof data.links.next == 'string') {
			const last = new URL(data.links.last).searchParams.get("page");
			const next = new URL(data.links.next).searchParams.get("page");
			console.log(`next: ${next} last: ${last}`);
			setTimeout(() => getData(next), 5000);
		  } else {
			console.log(data.links);
			productsRef.set(products);
			//fs.writeFileSync(path.join(__dirname + '/data/items-by-sku.json'), JSON.stringify(itemsBySku));
		  }
		} else {
		  console.error(data);
		}      
	  });
	}
	if (typeof products != 'undefined') {
	  getData(1);    
	}
}
  
function getProductJasper(id) {
console.log(`B: ${id}, A:${parseInt(id)}`);
console.log(typeof id);
if (typeof id != 'undefined') {
	return new Promise(async resolve => {
	/*  Version for Cloud Firestore
	const dataRef = db.collection('products');
	const snapshot = await dataRef.where('bigcommerce_product_id', '==', parseInt(id)).get();
	if (snapshot.empty) {
		console.log('No matching documents.');
		return;
	}  
	snapshot.forEach(doc => {      
		sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ doc.data().jasper_id }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
		.then(data => {
		data = JSON.parse(data);
		resolve(data);
		});
	}) */
	productsRef.orderByChild('bigcommerce_product_id').equalTo(parseInt(id)).on('child_added', (snapshot) => {
		//console.log(snapshot.key);
		sendGETPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ snapshot.val().jasper_id }`, {'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN})
		.then(data => {
		data = JSON.parse(data);
		resolve(data);
		});
	});
	});
} else {
	return { error: "Error con el id" + id }
}

}

function createProductRelationsJasper(type, relatedProducts) {
var i = 0;
const iterar = (resolve) => {
	const products = relatedProducts.filter(x => x != relatedProducts[i]);
	var promises = [];
	products.forEach(element => {
	console.log(`${relatedProducts[i]} to ${element}`);
	promises.push(sendPOSTPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ relatedProducts[i] }/relations/${ element }/type/${ type }`, { 'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN }, {}));
	})

	Promise.all(promises).then(values => {
	if (values.hasOwnProperty("errors")) {
		console.log(values);
		resolve(false)
	}
	if (i < relatedProducts.length-1) {
		i += 1;
		iterar(resolve);
	} else {
		resolve(true)
	}
	})
}

return new Promise(resolve => {
	iterar(resolve);
})
}

function deleteProductRelationsJasper(type, relatedProducts) {
var i = 0;
const iterar = (resolve) => {
	const products = relatedProducts.filter(x => x != relatedProducts[i]);
	var promises = [];
	products.forEach(element => {
	console.log(`${relatedProducts[i]} to ${element}`);
	promises.push(sendDELETEPromised(process.env.JASPER_API_DOMAIN, `/api/v1/products/${ relatedProducts[i] }/relations/${ element }/type/${ type }`, { 'Authorization': "Bearer " + process.env.JASPER_ACCESS_TOKEN }, {}));
	})

	Promise.all(promises).then(values => {
	if (values.errors) {
		console.log(values);
		resolve(false)
	}
	if (i < relatedProducts.length-1) {
		i += 1;
		iterar(resolve);
	} else {
		resolve(true)
	}
	})
}

return new Promise(resolve => {
	iterar(resolve);
})
}