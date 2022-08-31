/**
 * BigCommerce Sync 
 * This activate the sync process at the time needed
 * Remember the hour of the server is different 
*/ 

function autoSynchronications() {
	setInterval(async () => {
		const time = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}));
		const firstHour = new Date(time.setHours(6)).setMinutes(0)
		const secondHour = new Date(time.setHours(12)).setMinutes(0)
		const thirdHour = new Date(time.setHours(1)).setMinutes(0)
		const productSyncHour = (time.getDay() == 0) ? new Date(time.setHours(12)).setMinutes(0) : 0;
		var check = null
	
		switch (time) {
			case firstHour: case secondHour: case thirdHour: // Price Synchronization
				check = await testPrices(false);
				if (!check) {
					await syncPrices();
					if (time.getHours() == 1) {
						testPrices(true);        
					}
				}
				break;
	
			case firstHour.setMinutes(20): case secondHour.setMinutes(20): case thirdHour.setMinutes(20): // Inventory Synchronization
				check = await testInventory(false);
				if (!check) {
					await syncInventory();
					if (time.getHours() == 1) {
						testInventory(true);
					}
				}
				break;
	
			case firstHour.setMinutes(40): case secondHour.setMinutes(40): case thirdHour.setMinutes(40): // BulkPricing Synchronization
				syncQuantityBreaks();
				break;
	
			case firstHour.setMinutes(45): case secondHour.setMinutes(45): case thirdHour.setMinutes(45): // PurchaseDateSAP Synchronization
				syncPurchaseDataSAP();
				break;
	
			case firstHour.setMinutes(50): case secondHour.setMinutes(50): case thirdHour.setMinutes(50): // Metafields Synchronization
				syncMetafields();
				break;
	
			case productSyncHour: // Product from BigCommerce this will be deprecated
				getProductsBigCommerce();
				break;
		
			default:
				break;
		}
	}, 58000);
}


function getProductsBigCommerce() {  
	const products = [];
  
	async function getData(page) {
	  bigCommerce.get('/catalog/variants' + page)
	  .then(data => {
		data.data.forEach(item => {
		  if (item.option_set_id == null && item.sku != '') {
			/* const res = await db.collection('products').doc(item.sku).set({
			  "sku": item.sku,
			  "bigcommerce_product_id": item.product_id,
			  "bigcommerce_variant_id": item.id,
			  "option_values": item.option_values
			}); */
			products.push({
			  "sku": item.sku,
			  "bigcommerce_product_id": item.product_id,
			  "bigcommerce_variant_id": item.id,
			  "option_values": item.option_values
			})
		  }
		});
		if (data.meta.pagination.links.hasOwnProperty('next')) {
		  console.log(`Getting products from BigCommerce ${Math.floor((parseInt(data.meta.pagination.current_page)*100)/parseInt(data.meta.pagination.total_pages))}% Completed`);
		  getData(data.meta.pagination.links.next);
		}
  
		if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
		  console.log('Proccess finished wait for synchronizing Jasper Ids');
		  //getVariantsBigCommerce(bigCommerceItems);
		  console.log(products.length);
		  getProductsJasper(products);
		}
	  })
	  .catch((err) => console.error(err));
	}
	
	getData(''); 
  }
  
  function getVariantsBigCommerce(bigCommerceItems) {
  
	getData('');
	function getData(page) {
	  bigCommerce.get('/catalog/variants' + page)
	  .then(data => {
		data.data.forEach(item => {
		  if (item.option_values.length > 0) {
			if (typeof bigCommerceItems.find(x => x.sku == item.sku) == 'undefined') {
			  bigCommerceItems.push({
				"sku": item.sku,
				"bigcommerce_product_id": item.product_id,
				"bigcommerce_variant_id": item.id
			  })
			}
		  }
		})
  
		if (data.meta.pagination.links.hasOwnProperty('next')) {
		  console.log(`Getting variants from BigCommerce ${Math.floor((parseInt(data.meta.pagination.current_page)*100)/parseInt(data.meta.pagination.total_pages))}% Completed`);
		  getData(data.meta.pagination.links.next);
		}
  
		if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
		  productsRef.set(bigCommerceItems);
		  console.log('Proccess finished');
		}
	  })
	  .catch((err) => console.error(err));
	}
  }
  
  async function getMetafieldsBigCommerce(index) {
	var bigCommerceItems = [];
	await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
	
	var i,j, temporary = [], chunk = 100;
	for (i = 0,j = bigCommerceItems.length; i < j; i += chunk) {
	  temporary.push(bigCommerceItems.slice(i, i + chunk));
	}
	
	setMetafieldChunks(index)
	function setMetafieldChunks(i) {
	  console.log(`Sync: ${i} of ${temporary.length}`);
	  temporary[i].forEach(async (element) => {
		const index = bigCommerceItems.findIndex(x => x.sku == element.sku);
		if (!element.hasOwnProperty('metafields')) {
		  if (element.hasOwnProperty('bigcommerce_variant_id')) {
			var data = await getData(element, 'variant');
			element['metafields'] = data;
			bigCommerceItems.fill(element, index, index+1);
		  } else {
			var data = await getData(element, 'product');
			element['metafields'] = data;
			bigCommerceItems.fill(element, index, index+1);
		  }
		  productsRef.set(bigCommerceItems);
		  console.log("Writed: " + element.sku);
		}
	  });
	}
  
	async function getData(x, type) {
	  return new Promise(resolve => {
		var metafields = [];
		var reactor = new Reactor();
		reactor.registerEvent('finish');
		reactor.addEventListener('finish', function(){
		  resolve(metafields)
		});
		
		const fetchProductMetafields = (page) => {
		  bigCommerce.get(`/catalog/products/${ x.bigcommerce_product_id }/metafields${ page }`)
		  .then(data => {
			metafields = data.data;
  
			if (data.meta.pagination.links.hasOwnProperty('next')) {
			  fetchProductMetafields(data.meta.pagination.links.next);
			}
  
			if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
			  reactor.dispatchEvent('finish');
			}
		  })
		  .catch((err) => console.error(err));
		}
  
		const fetchVariantMetafields = (page) => {
		  bigCommerce.get(`/catalog/products/${ x.bigcommerce_product_id }/variants/${ x.bigcommerce_variant_id }/metafields${ page }`)
		  .then(data => {
			metafields = data.data;
  
			if (data.meta.pagination.links.hasOwnProperty('next')) {
			  fetchVariantMetafields(data.meta.pagination.links.next);
			}
  
			if (data.meta.pagination.total_pages == data.meta.pagination.current_page) {
			  reactor.dispatchEvent('finish');
			}
		  })
		  .catch((err) => console.error(err));
		}
  
		switch (type) {
		  case 'product':
			fetchProductMetafields('')
			break;
  
		  case 'variant':
			fetchVariantMetafields('')        
			break;
		
		  default:
			console.error('type undefined');
			break;
		}
	  })
	}
  }

  
function getProductsBigcommerceBySku(products) {
	return new Promise(resolve => {
	  var response = [];
	  
	  const getData = (page) => {
		bigCommerce.get(`/catalog/products?sku:in=${products}&page=${page}&include=custom_fields,images,bulk_pricing_rules`)
		.then(async data => {
		  response = response.concat(data.data);
		  if (data.meta.pagination.current_page < data.meta.pagination.total_pages) {
			getData(data.meta.pagination.current_page + 1);
		  } else {
			bigCommerce.get(`/pricelists/1/records?include=bulk_pricing_tiers&sku:in=${products}`)
			.then(prices => {
			  resolve(response.map(x => {
				let item = prices.data.find(n => n.product_id == x.id);
				// Could be undefined if there is no price in this list
				if (typeof item != 'undefined') {
				  x.price_b2b = item.price;
				  x.bulk_pricing_tiers = (typeof item.bulk_pricing_tiers != 'undefined') ? item.bulk_pricing_tiers : [];
				} else {
				  x.price_b2b = 0;
				  x.bulk_pricing_tiers = [];
				}
				return x;
			  }));
			})
		  }
		})
		.catch((err) => console.error(err));
	  }
	  getData(1);
	})
  }

module.exports = autoSynchronications



  