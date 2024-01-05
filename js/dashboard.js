/**
 * File: dashboard.js
 * Description: This file contains functions for the dashboard tab, including the graphs and the loading system
 * Author: Luis Mario Estrada Pereyra
 * Date: 14-02-2023
 */

// Imports
import * as storage from "./storage.js";
import * as settings from "./settings.js";
import * as period from "./periodhandler.js";
import * as notifications from "./notifications.js";

/**
 * Dashboard Config
 */
const maxGoal = 9;

/**
 * Variables for graphs
 */
let weekGraphLoaded = null;
let weekGraphInfo;

// Add listener for the Refresh button
document.getElementById("reload-dashboard").addEventListener("click", location.reload);

// Listeners for goal increase/decrease
document.getElementById("goalinc").addEventListener("click", increaseGoal);
document.getElementById("goaldec").addEventListener("click", decreaseGoal);

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
    // Get Elements
    const todayCard = document.getElementById("todayscard");
    // Check if there's something already available on storage for today
    storage.getDataFromLocalStorage("rec-" + moment().format("DD-MM-YYYY")).then(value => {
        if (!value.empty) {
            // Call records are present, display the information
            todayCard.style.display = "flex";
            document.getElementById("todayscard-norecs").style.display = "none";
            document.getElementById("today-calls").innerHTML = value.calls.length;
            document.getElementById("today-calltime").innerHTML = value.totalDuration;
            document.getElementById("today-calllongest").innerHTML = value.highestDuration;
            document.getElementById("today-callshortest").innerHTML = value.lowestDuration;
            document.getElementById("today-callaverage").innerHTML = value.avgDuration;
        } else {
            // Call records not present, show additional info
            todayCard.style.display = "none";
            document.getElementById("todayscard-norecs").style.display = "flex";
        }
    });
    storage.getDataFromLocalStorage("shift-" + moment().format("DD-MM-YYYY")).then(value => {
        if (!value.empty) {
            // NOT CONSIDERING DAYS OFF
            // Shift records are present
            document.getElementById("today-totalminutes").innerHTML = value.mins.immediate + " mins";
            document.getElementById("today-totalap").innerHTML = value.mins.ap + " mins";
            document.getElementById("today-totalbreaks").innerHTML = value.mins.lunch + value.mins.break + " mins";
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
        aspectRatio: 1.5,
        responsive: true,
        interaction: {
            intersect: false,
            mode: "index",
        },
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
                title: {
                    display: true,
                    text: "Minutes",
                },
            },
        },
        plugins: {
            legend: {
                position: "bottom",
                align: "start",
                labels: {
                    usePointStyle: true,
                    pointStyle: "rectRounded",
                },
            },
            title: {
                display: true,
                text: "Minutes/day",
            },
        },
    };

    // Graph Data
    weekGraphInfo = {
        labels: [],
        datasets: [
            {
                label: "Immediate",
                data: [],
                borderWidth: 1,
                tension: 0.1,
                fill: true,
            },
            {
                label: "AP",
                data: [],
                borderWidth: 1,
                tension: 0.1,
                fill: true,
            },
            {
                label: "Break/Lunch",
                data: [],
                borderWidth: 1,
                tension: 0.1,
                fill: true,
            },
        ],
    };

    // Get today
    let now = moment();

    // Store the loop Promises
    const dataPromises = [];

    // Validation flag
    let loadedDays = 0;

    // Load the info of the last 7 days
    for (let i = 0; i < 9; i++) {
        // Generate a new Promise for the data to load
        const promise = new Promise((resolve, reject) => {
            // Get the shift data of the day
            const iDay = moment(now).add(i * -1, "days");

            storage.getDataFromLocalStorage("shift-" + iDay.format("DD-MM-YYYY")).then(value => {
                // Check if shift records are present
                if (!value.empty && value.type != "Off") {
                    // Set the labels for the day
                    weekGraphInfo.labels.unshift(iDay.format("ddd DD/MM"));

                    // Add the values
                    weekGraphInfo.datasets[0].data.unshift(value.mins.immediate);
                    weekGraphInfo.datasets[1].data.unshift(value.mins.ap * -1);
                    weekGraphInfo.datasets[2].data.unshift(value.mins.lunch + value.mins.break);
                    // Increase the value of the loaded days
                    loadedDays++;
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
    const wkChrt = document.getElementById("weekChart");
    // Create the chart
    if (!weekGraphLoaded) weekGraphLoaded = new Chart(wkChrt, {type: "bar", data: weekGraphInfo, options: opts});
    else {
        // Chart is already loaded, so just update the data
        weekGraphLoaded.data = weekGraphInfo;
        // Refresh the chart
        weekGraphLoaded.update();
    }

    // Get the saved daily goal
    document.getElementById("goal").value = settings.savedSettings.dailyGoal;

    // Calculate Hour Difference
    calculateHrDiff();

    // Lock Daily Goal's buttons if needed
    goalButtonCheck();
}

function changeGoal(chgNum) {
    // Get element
    const goalInput = document.getElementById("goal");

    // Get number
    const num = +goalInput.value;
    const newNum = num + chgNum;

    // Increase or decrease, if possible
    if (newNum >= 0 && newNum <= maxGoal) {
        goalInput.value = newNum;
        // Check buttons
        goalButtonCheck();

        // Set the new number in settings
        settings.savedSettings.dailyGoal = newNum;

        // Calculate Hour Difference
        calculateHrDiff();

        // Save settings
        settings.saveSettings();
    }
}

function increaseGoal() {
    changeGoal(0.5);
}

function decreaseGoal() {
    changeGoal(-0.5);
}

function goalButtonCheck() {
    const goalNum = document.getElementById("goal").value;
    const goalInc = document.getElementById("goalinc");
    const goalDec = document.getElementById("goaldec");

    goalDec.disabled = goalNum == 0;
    goalInc.disabled = goalNum == maxGoal;
}

function calculateHrDiff() {
    const dailyGoal = +document.getElementById("goal").value;
    const loadedDays = +weekGraphInfo.labels.length;

    const acumGoal = dailyGoal * loadedDays;

    let workedHours = 0;
    for (let i = 0; i < loadedDays; i++) {
        workedHours += weekGraphInfo.datasets[0].data[i];
        workedHours += weekGraphInfo.datasets[2].data[i];
    }

    workedHours /= 60;

    const hourDiff = document.getElementById("week-difference");
    hourDiff.innerHTML = +(acumGoal - workedHours) + " hours";
}

/**
 * Loads the card for the Period Progress
 *
 */
async function loadPeriod() {
    // Get estimated paycheck for this period
    const periodInfo = period.getPeriodOf(moment(new Date()));
    const periodDates = period.getDatesOf(periodInfo.period, periodInfo.taxYear);
    const paycheckInfo = await period.getPeriodInfo(periodInfo.period, periodInfo.taxYear);

    const firstDay = moment(periodDates.startDate, "DD-MM-YYYY");
    const lastDay = moment(periodDates.endDate, "DD-MM-YYYY");
    const totalDays = lastDay.diff(firstDay, "days");

    let totalCalls = 0;
    let longestCall = moment("00:00:00", "HH:mm:ss");
    let callTime = moment("00:00:00", "HH:mm:ss");
    let minsOnline = 0;

    for (let iDay = moment(periodDates.startDate, "DD-MM-YYYY"); lastDay.diff(iDay, "days") >= 0; iDay.add(1, "d")) {
        const recs = await storage.getDataFromLocalStorage("rec-" + iDay.format("DD-MM-YYYY"));
        const shift = await storage.getDataFromLocalStorage("shift-" + moment().format("DD-MM-YYYY"));

        // If no records, continue to next day
        if (recs.empty) continue;

        // Call records are present

        // Get longest call
        const highestC = moment(recs.highestDuration, "HH:mm:ss");
        if (highestC.diff(longestCall) > 0) longestCall = highestC;

        // Add day's total calls
        totalCalls += recs.calls.length;

        // Add today's calls duration

        const callDuration = moment(recs.totalDuration, "HH:mm:ss");
        callTime.add(callDuration.format("ss"), "s");
        callTime.add(callDuration.format("mm"), "m");
        callTime.add(callDuration.format("HH"), "h");

        if (shift.empty) continue;

        // NOT CONSIDERING DAYS OFF
        minsOnline += shift.mins.immediate;
    }

    minsOnline /= 60;

    document.getElementById("paysummary-total-calls").innerHTML = totalCalls;
    document.getElementById("paysummary-longest-call").innerHTML = longestCall.format("HH:mm:ss");
    document.getElementById("paysummary-total-call-time").innerHTML = callTime.format("HH:mm:ss") + " total call time";
    document.getElementById("paysummary-mins-online").innerHTML = minsOnline + " hours";

    // Check if there's something already available on storage for today

    // Format the estimated Paycheck
    const formattedValue = paycheckInfo.grandTotal.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
    });

    document.getElementById("paysummary-paycheck").innerHTML = formattedValue;

    if (totalCalls == 0) {
        // Call records not present, show additional info
        document.getElementById("paysummary-norecs").style.display = "flex";
    }
}
