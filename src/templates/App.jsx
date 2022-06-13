import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Products from './pages/Products';
import Home from './pages/Home';


function App () {
    return (
        <div className="App">
        <h1>Welcome to React Router!</h1>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="products" element={<Products />}>
                <Route path=":id" element={<Products />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </div>
    )
}

export default App;

function NotFoundPage() {
    return(
        <h1>404 Sorry</h1>
    )
    
}