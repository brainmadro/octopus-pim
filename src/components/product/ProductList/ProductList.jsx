import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Table from '../../common/Table';
import Button from '../../common/Button';
import utils from '../../../utils';
import './ProductList.css';
import SearchForm from '../../common/SearchForm/SearchForm';

function ProductList () {
    const [state, setState] = useState({
        data: [],
        meta: {}
    });

    useEffect(() => {
        //if(typeof table == 'undefined') return
        utils.api.product.getAll(20, 1)
        .then((res) => {
            setState({
                ...state,
                data: res.data, 
                meta: res.meta
            })
        })
        .catch((err) => console.log(err))
    }, [])

    const data = state.data.map(x => { 
        return {
            id: x.id,
            asset_thumbnail: x.asset_thumbnail, 
            sku: x.sku, 
            name: x.name, 
            enabled: (x.enabled) ? 'Enabled' : 'Disabled', 
            inventory: x.inventory, 
            price: x.price, 
            brand: x.brand_id
        }
    });

    const columns = [
        {
            title: "Image",
            field: "asset_thumbnail",
        },
        {
            title: "SKU",
            field: "sku",
        },
        {
            title: "Name",
            field: "name",
        },
        {
            title: "Status",
            field: "enabled",
        },
        {
            title: "Inventory",
            field: "inventory",
        },
        {
            title: "Price",
            field: "price",
        },
        {
            title: "Brand",
            field: "brand",
        }
    ];
    
    function handlePrevPage () {
        utils.api.product.getAll(state.meta.pagination.prev.limit, state.meta.pagination.prev.page)
        .then((res) => {
            setState({
                ...state,
                data: res.data, 
                meta: res.meta
            })
        })
        .catch((err) => console.log(err))
    }
    
    function handleNextPage () {
        utils.api.product.getAll(state.meta.pagination.next.limit, state.meta.pagination.next.page)
        .then((res) => {
            setState({
                ...state,
                data: res.data, 
                meta: res.meta
            })
        })
        .catch((err) => console.log(err))
    }

    function SetPages() {
        if (typeof state.meta.pagination == 'undefined') return ''
        const starts = (state.meta.pagination.current.page*state.meta.pagination.current.limit) - state.meta.pagination.current.limit
        const ends = (state.meta.pagination.next.page*state.meta.pagination.next.limit) - state.meta.pagination.next.limit
        return (<span>{starts} - {ends}</span>)
    }
    
	function updateTable(ref) {
		utils.api.product.find(ref, 20, 1)
        .then((res) => {
            setState({
                ...state,
                data: res.data, 
                meta: res.meta
            })
        })
        .catch((err) => console.log(err))
	}

    function alert() {
        Swal.fire(
            'Building',
            'This feature will be ready soon',
            'error'
        )
        console.log('This feature will be ready soon');
    }

    return(
    <div className='product-list-container'>
        <div className='product-header-list'>
            <div>
                <input type="checkbox" name="select-all-products" id="select-all-products_checkbox" />
                <SearchForm table={''} onSubmit={updateTable} />
                <Button onClick={alert} className='header-option-button' icon={'fa-solid fa-cloud-arrow-down'} />
                <Button onClick={alert} className='header-option-button' icon={'fa-solid fa-pen-to-square'} />
            </div>
            <div>
                <SetPages/> of 1999
                <Button onClick={handlePrevPage} icon={'fa-solid fa-angle-left'} />
                { (typeof state.meta.pagination != 'undefined') ? state.meta.pagination.current.page : 1 }
                <Button onClick={handleNextPage} icon={'fa-solid fa-angle-right'} />
                <Button onClick={alert} className='header-option-button' icon={'fa-solid fa-filter'} />
            </div>
        </div>
        <div className='product-body-list'>
            <Table title={"product-list"} data={data} columns={columns}/>
        </div>
    </div>
    );
    
}

export default ProductList;