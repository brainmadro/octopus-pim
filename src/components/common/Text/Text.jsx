import React from "react";

function Text(props) {
	return <span style={props.style} className={props.className}>{props.children}</span>
}

export default Text;