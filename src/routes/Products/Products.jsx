import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import ProductList from "../../components/product/ProductList";
import StatisticsCard from '../../components/product/StadisticsCard';
import "./Product.css"


function Products () {
    let params = useParams();
    if (params.hasOwnProperty('id')) {
        return (
            <Outlet />            
        )
    } else {
        return( 
            <main>
                <div className="card product-list"><ProductList /></div>
            </main>
        );    
    }
    
}

export default Products;