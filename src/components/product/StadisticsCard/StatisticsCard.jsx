import React, { useState, useEffect } from 'react';
import "./StadisticCard.css";

function StatisticsCard ({title}) {
    const [value, updateValue] = useState();
    return(
        <div className='card'>
            <h3 className='card-title'>{title}</h3>
            <div className='card-content'>
                <div className="circle_progress_bar-container">
                    <div className="wattage-circle_progress_bar circle_progress_bar">
                        <span className="wattage_progress_bar-text"><i className="fas fa-bolt"></i>Wattage</span>
                        <svg>
                            <circle className="bg" cx="40" cy="40" r="37"></circle>
                            <circle id="wattage-pbar" className="progress one" cx="40" cy="40" r="37"></circle>
                        </svg>
                    </div>
                </div>
                <h2 className='statistic-quantity'>800</h2>
            </div>
        </div>
    );        
}


/* const wattagePBar = document.getElementById('wattage-pbar');
function calculatePercentage(metafields) {

  return {
    watter_per: 0.5,
    current_per: 0.5,
    voltage_per: 0.5
  };
}

function fillCircleProgressBar(wattage, current, voltage) {
    wattage = 232.36 - 232.36/(100/wattage);
    current = 232.36 - 232.36/(100/current);
    voltage = 232.36 - 232.36/(100/voltage);
    animateProgressBar(wattagePBar, wattage);
}

function animateProgressBar(stroke, value) {
    stroke.animate([
        // keyframes
        { strokeDashoffset: '232.36' },
        { strokeDashoffset: value }
    ], {
        // timing options
        duration: 2500,
        fill: "forwards"
    });
}

function setPercentage(array, currentVariant) {
    var units = 100 / array.length;
    //console.log((array.indexOf(currentVariant) + 1) + "*" + units);
    return (array.indexOf(currentVariant) + 1) * units;
}

const percentages = calculatePercentage();
//console.log(percentages);
fillCircleProgressBar(percentages.watter_per, percentages.current_per, percentages.voltage_per); */

export default StatisticsCard;