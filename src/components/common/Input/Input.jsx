import React from "react";
import './Input.css'

function Input(props) {
	return <input type={props.type} id={props.id} name={props.name} style={props.style} />
}

export default Input;