import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Button from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import Input from "../../components/common/Input";
import SubTitle from "../../components/common/SubTitle";
import Title from "../../components/common/Title";
import utils from "../../utils";
import './ProductPage.css'
import PropTypes from 'prop-types';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import AssetsTable from "../../components/product/AssetsTable";
import CustomFieldsTable from "../../components/product/CustomFieldsTable/CustomFieldsTable";
import EnabledButton from "../../components/common/EnabledButton/EnabledButton";
import Text from "../../components/common/Text";

function TabPanel(props) {
	const { children, value, index, ...other } = props;
  
	return (
	  <div
		role="tabpanel"
		hidden={value !== index}
		id={`simple-tabpanel-${index}`}
		aria-labelledby={`simple-tab-${index}`}
		{...other}
	  >
		{value === index && (
		  <Box sx={{ p: 3 }}>
			{children}
		  </Box>
		)}
	  </div>
	);
}
  
TabPanel.propTypes = {
	children: PropTypes.node,
	index: PropTypes.number.isRequired,
	value: PropTypes.number.isRequired,
};
  
function a11yProps(index) {
	return {
	  id: `simple-tab-${index}`,
	  'aria-controls': `simple-tabpanel-${index}`,
	};
}

function ProductPage() {
	let params = useParams();
	const [product, setProduct] = useState({ inventories: {
		inventory_level: 0,
		locations: []
	}})
	console.log(params);

	useEffect(() => {
		utils.api.product.getSingleProduct(params.id)
		.then((res) => {
            setProduct({
                ...product,
                ...res
            })
			console.log("product",product);
        })
        .catch((err) => console.log(err))
	}, [])

	const [value, setValue] = React.useState(0);

	const handleChange = (event, newValue) => {
		setValue(newValue);
	};

	return (
		<main className='product-page'>
			<div className="product-details-container">
				<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
					<Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
						<Tab label="Details" {...a11yProps(0)} />
						<Tab label="Assets" {...a11yProps(1)} />
						<Tab label="Custom Fields" {...a11yProps(2)} />
						<Tab label="Attributes" {...a11yProps(3)} />
						<Tab label="Relations" {...a11yProps(4)} />
					</Tabs>
				</Box>
				<TabPanel value={value} index={0}>
					<Title text={product.name} />
					<label htmlFor="name">Name</label>
					<Input type='text' name='name' id='name' />
					<label htmlFor="sku">SKU</label>
					<Text className='info-read-only'>{product.sku}</Text>
					
					{/* <TextArea  name='product-short-description' />
					<TextArea  name='product-long-description' /> */}

					<div className="section-container">
						<label htmlFor="barcode">Barcode*</label>
						<Text className='info-read-only'>{'product.barcode'}</Text>
						<label htmlFor="barcode-type">Type*</label>
						<Text className='info-read-only'>UPC</Text>
					</div>

					<div className="section-container">
						<SubTitle text='Inventory Location' />
						<label htmlFor="inventory-level">Inventory Level</label>
						<Text className='info-read-only'>{product.inventories.inventory_level}</Text>
						<label htmlFor="inventory-warning">Inventory Warning</label>
						<Input type='text' name='inventory-warning' id='inventory-warning' />
					</div>

					<div className="section-container">
						<SubTitle text='Price' />
						<label htmlFor="price_list">Price List</label>
						<Text className='info-read-only'>B2B</Text>
						<label htmlFor="price">Price</label>
						<Text className='info-read-only'>99.00</Text>
						<label htmlFor="bulk_pricing_tires">Bulk Pricing Tires</label>
						<Input type='text' name='bulk_pricing_tires' id='bulk_pricing_tires' />
						<label htmlFor="discount">Discount</label>
						<Text className='info-read-only'>0.0</Text>
						<label htmlFor="discount">Calculated Price</label>
						<Text className='info-read-only'>99.00</Text>
					</div>
					<div className="section-container">
						<label htmlFor="pack_multiple">Pack Multiple</label>
						<Text className='info-read-only'>20</Text>
						<label htmlFor="weight">Weight</label>
						<Text className='info-read-only'>2.5</Text>
						<label htmlFor="master_case">Master Case</label>
						<Text className='info-read-only'>60</Text>
					</div>
				</TabPanel>
				<TabPanel value={value} index={1}>
					<Button text='Update Asset'/>
					<AssetsTable productId={product.id} data={['pimera', 'segunda']}/>
				</TabPanel>
				<TabPanel value={value} index={2}>
					<form onSubmit={''} method="post">
						<label htmlFor="name">Name</label>
						<Input type='text' name='name' id='name' />
						<label htmlFor="slug">Slug</label>
						<Input type='text' name='slug' id='slug' />
						<label htmlFor="type">Type</label>
						<Input type='text' name='type' id='type' />
						<label htmlFor="value">Value</label>
						<Input type='text' name='value' id='value' />
						<Button onClick={'submit'} text='Create Custom Field' />
					</form>
					<CustomFieldsTable />
				</TabPanel>				
			</div>
			<div className="product-features-container">
				<EnabledButton />
				<Button text='CLONE'/>
				<Button text='DELETE'/>
				{/* Channels */}
				<label htmlFor="product_type">This is a physical product</label>
				<Input type='checkbox' name='product_type'  id='product_type' />
				<label htmlFor="brand">Brand</label>
				<Input type='text' name='brand' id='brand' />
				<label htmlFor="categories">Categories</label>
				<Input type='text' name='categories'  id='categories' />{/* Convert to tree as Jasper*/}
				<label htmlFor="tags">Tags</label>
				<Input type='text' name='tags'  id='tags' />
			</div>
			{/* <Heading text='Brian Madroñero' style={{ fontSize: "40pt"}}/>
			<SubTitle text='Full Stack Web Developer' /> */}
		</main>
	)
}

export default ProductPage
