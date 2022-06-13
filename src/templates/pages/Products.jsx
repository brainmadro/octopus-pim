import React from 'react';
import { useParams } from 'react-router-dom';

function Products () {
    console.log(useParams());
    let { id } = useParams();
    return(
        <h1>Hola Products ID: {id}</h1>
    );
}

export default Products;