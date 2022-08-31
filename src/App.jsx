import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Products from './routes/Products/Products';
import Home from './routes/Home';
import Sidebar from './components/common/SideBar'
import ProductPage from './routes/ProductPage';


function App () {
    return (
        <>
            <Sidebar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="products" element={<Products />}>
                    <Route path=":id" element={<ProductPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </>        
    )
}

export default App;

function NotFoundPage() {
    return(
        <h1>404 This page is been prepared or maybe you are lost</h1>
    )
    
}