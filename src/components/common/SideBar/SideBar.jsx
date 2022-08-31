import React from 'react';
import "./SideBar.css"
import SideBarLink from '../SideBarLink';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function SideBar () {
    return(
        <section className='sidebar'>
            <div className='profile'>
                <img src="" alt="" />
                username
            </div>
            <nav>
                <a href="https://app.hedelco.com/dashboard" target='_blank'><FontAwesomeIcon icon="fa-solid fa-toolbox" />Admin Tools</a>
                <SideBarLink to={"/analytics"} text={"Analytics"} icon={"fa-chart-pie"}/>
                <SideBarLink to={"/attributes"} text={"Attributes"} icon={"fa-list-ol"}/>
                <SideBarLink to="/brands" text={"Brands"} icon={"fa-registered"}/>
                <SideBarLink to="/categories" text={"Categories"} icon={"fa-folder-tree"}/>
                <SideBarLink to="/Channels" text={"Channels"} icon={"fa-store"}/>
                <SideBarLink to="/import-export" text={"Import / Export"} icon={"fa-file-import"}/>
                <SideBarLink to="/inventories" text={"Inventories"} icon={"fa-cart-flatbed"}/>
                <SideBarLink to="/logging" text={"Logging"} icon={"fa-clipboard-list"}/>
                <SideBarLink to="/prices" text={"Prices"} icon={"fa-tags"}/>
                <SideBarLink to="/products" text={"Products"} icon={"fa-cart-shopping"}/>
                <SideBarLink to="/settings" text={"Settings"} icon={"fa-gear"}/>
                <SideBarLink to="/settings" text={"Versions"} icon={"fa-code-branch"}/>
            </nav>
        </section>
    );  
}
export default SideBar;