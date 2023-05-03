/**
 * File: dashboard.js
 * Description: This file contains functions for the dashboard tab, including the graphs and the loading system
 * Author: Luis Mario Estrada Pereyra
 * Date: 14-02-2023
 */

// Imports
import * as storage from './storage.js';
import * as notifications from './notifications.js';

/**
 * Variables for graphs
 */
let weekGraphLoaded = null;

// Add listener for the Refresh button
document.getElementById("reload-dashboard").addEventListener("click", () => {
    Init();
});

/**
 * Dashboard Initializer
 * 
 */
export function Init() {
    
    // Load Today's Card
    loadToday();
    // Load Week's Card
    loadWeek();
    // Load Period's Card
    loadPeriod();
}

/**
 * Loads the card for Today's Progress
 * 
 */
function loadToday() {
    // Check if there's something already available on storage for today
    storage.getDataFromLocalStorage("rec-" + moment().format('DD-MM-YYYY')).then((value) => {
        if(!value.empty) {
            // Call records are present, display the information
            document.getElementById("todayscard").style.display = "flex";
            document.getElementById("todayscard-norecs").style.display = "none";
            document.getElementById("today-calls").innerHTML = value.calls.length;
            document.getElementById("today-calltime").innerHTML = value.totalDuration;
            document.getElementById("today-calllongest").innerHTML = value.highestDuration;
            document.getElementById("today-callshortest").innerHTML = value.lowestDuration;
            document.getElementById("today-callaverage").innerHTML = value.avgDuration;
        }
        else {
            // Call records not present, show additional info
            document.getElementById("todayscard").style.display = "none";
            document.getElementById("todayscard-norecs").style.display = "flex";
        }
    });
    storage.getDataFromLocalStorage("shift-" + moment().format('DD-MM-YYYY')).then((value) => {
        if(!value.empty) {
            // NOT CONSIDERING DAYS OFF
            // Shift records are present
            document.getElementById("today-totalminutes").innerHTML = value.mins.immediate + " mins";
            document.getElementById("today-totalap").innerHTML = value.mins.ap + " mins";
            document.getElementById("today-totalbreaks").innerHTML = (value.mins.lunch + value.mins.break) + " mins";
        }
    });
}

/**
 * Loads the card for Weekly Progress
 * 
 * @async
 */
async function loadWeek() {
    // Graph options
    const opts = {
        aspectRatio: 2,
        responsive: true,
        scales: {
            x: {
                stacked: true
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: "Minutes"
                }
            }
        },
        plugins: {
            legend: {
              position: 'bottom',
            },
            title: {
              display: true,
              text: 'Minutes per day'
            }
        }
    }

    // Graph Data
    let weekGraphInfo = {
        labels: [],
        datasets: [{
            label: 'Immediate',
            data: [],
            borderWidth: 1,
            tension: 0.1,
            fill: true
        },{
            label: 'AP',
            data: [],
            borderWidth: 1,
            tension: 0.1,
            fill: true
        },{
            label: 'Break/Lunch',
            data: [],
            borderWidth: 1,
            tension: 0.1,
            fill: true
        }]
    }

    // Get today
    let now = moment();

    // Store the loop Promises
    const dataPromises = [];

    // Load the info of the last 7 days
    for(let i = 0; i < 7; i++) {
        // Set the labels for the day
        weekGraphInfo.labels.unshift(moment(now).add((i * -1), 'days').format('ddd DD/MM'));
        // Generate a new Promise for the data to load
        const promise = new Promise((resolve, reject) => {
            // Get the shift data of the day
            storage.getDataFromLocalStorage("shift-" + moment(now).add((i * -1), 'days').format('DD-MM-YYYY')).then((value) => {
                // Check if shift records are present
                if(!value.empty && (value.type != "Off")) {
                    // Add the values
                    weekGraphInfo.datasets[0].data.unshift(value.mins.immediate);
                    weekGraphInfo.datasets[1].data.unshift(value.mins.ap * -1);
                    weekGraphInfo.datasets[2].data.unshift((value.mins.lunch + value.mins.break));
                }
                else {
                    // Add values in 0
                    weekGraphInfo.datasets[0].data.unshift(0);
                    weekGraphInfo.datasets[1].data.unshift(0);
                    weekGraphInfo.datasets[2].data.unshift(0);
                }
                // Send the resolve to the promise
                resolve(value);
            });
        });
        // Add the generated promise to the Promises array
        dataPromises.push(promise);
    }

    // Wait for all the Promises to get resolved
    await Promise.all(dataPromises);
    
    // Get the canvas container
    const wkChrt = document.getElementById('weekChart');
    // Create the chart
    if(!weekGraphLoaded) weekGraphLoaded = new Chart(wkChrt, {type: 'bar', data: weekGraphInfo, options: opts});
    else {
        // Chart is already loaded, so just update the data
        weekGraphLoaded.data = weekGraphInfo;
        // Refresh the chart
        weekGraphLoaded.update();
    }
}

/**
 * Loads the card for Today's Progress
 * 
 */
function loadPeriod() {
    // Check if there's something already available on storage for today
    storage.getDataFromLocalStorage("per-" + moment().format('DD-MM-YYYY')).then(
        function(value) {
            if(!value.empty) {
                // Call records are present, display the information
                document.getElementById("paysummary").style.display = "flex";
                document.getElementById("paysummary-norecs").style.display = "none";
            }
            else {
                // Call records not present, show additional info
                document.getElementById("paysummary").style.display = "none";
                document.getElementById("paysummary-norecs").style.display = "flex";
            }
        }
    );
}