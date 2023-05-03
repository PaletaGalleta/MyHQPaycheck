/**
 * File: calculator.js
 * Description: This file contains functions for managing the Calculator and Paycheck Pages in MyHQPaycheck.
 * Author: Luis Mario Estrada Pereyra
 * Date: 20-02-2023
 */

// Imports
import * as storage from './storage.js';

/** Dec-16 constant (Tax Year Start) */
const taxStart = moment("16-12-2022", "DD-MM-YYYY");

/** Jan-01-2023 constant */
const yearStart = moment("01-01-2023", "DD-MM-YYYY");

/** The array for periods */
let validPeriods = [];

/** The current Period */
let selectedPeriod = 0;

/** Variable for graph */
let graphLoaded = null;

/**
 * Calculator and Paycheck Initializer
 */
export function init() {
    /** Calculator container */
    const containerCalc = document.getElementById("calculator-tab-pane");
    // Click listeners
    containerCalc.querySelector("#period-first").addEventListener("click", () => { changePeriod(0); });
    containerCalc.querySelector("#period-prev").addEventListener("click", () => { changePeriod(selectedPeriod - 1); });
    containerCalc.querySelector("#period-next").addEventListener("click", () => { changePeriod(selectedPeriod + 1); });
    containerCalc.querySelector("#period-last").addEventListener("click", () => { changePeriod(validPeriods.length - 1); });

    loadSelector();
}


/**
 * Loads the calculator period selector
 */
async function loadSelector() {
    let value = await storage.getDataFromLocalStorage("settings");

    if(value.jobStart) {
        // Get the first day of work (If selected)
        const firstDay = moment(value.jobStart, "DD/MM/YYYY");

        // Load periods since the hire date
        if(moment(firstDay).diff(yearStart) > 0) loadPeriods(firstDay);
        // Load periods since start of 2023
        else loadPeriods(yearStart);
    }
    // Load periods since start of 2023
    else loadPeriods(yearStart);
}


/**
 * Loads all available periods of the user since the hiring date or 01/01/2023
 * 
 * @param {string} since - The date in which the function will start counting, it must be in "DD-MM-YYYY" format
 */
export function loadPeriods(since = yearStart) {
    // Get the start date of the corresponding period
    let tmpYear = getPeriodOf(since).taxYear;
    let tmpPeriod = getPeriodOf(since).period;
    let tmpDate = moment(getDatesOf(tmpPeriod, tmpYear).startDate, "DD-MM-YYYY");

    // Cycle since the beginning
    while(tmpDate.diff(moment()) < 0) {

        // Get the period info
        let periodInfo = getPeriodOf(tmpDate);

        // Add it to the array
        validPeriods.push(periodInfo);

        // Get the date of the end of the period and add one day
        tmpDate = moment(getDatesOf(periodInfo.period, periodInfo.taxYear).endDate, "DD-MM-YYYY");
        tmpDate = moment(tmpDate).add(1, 'd');
    }

    changePeriod(validPeriods.length - 1);

}


/**
 * Gets the period a date belongs to
 * 
 * @param {moment} date - The date to parse
 * 
 * @returns A JSON object containing the period number and the year the period belongs to
 */
export function getPeriodOf(date) {
    // Get tax year start depending on the date
    let taxYr = moment(date).year();
    let taxStartYear = moment(taxStart).year(taxYr);
    
    // Check the period depending on tax year
    if(date.diff(taxStartYear) < 0) taxStartYear = moment(taxStartYear).year(taxYr - 1);
    else taxYr++;
    
    // Get the difference in months since the start of the corresponding tax year
    let mths = date.diff(taxStartYear, 'months');
    
    // Set the offset based on the half of the month, so 1-15 is 0 and 16-end is 1
    let offset = (Math.floor(moment(date).date() / 16) == 0) ? 1 : 0;
    
    // Form the period according to the formula
    let period = mths * 2 + 1 + offset;

    // Return the object with the period and the tax year
    return {"period": period, "taxYear": +moment(taxStartYear).year(taxYr).format("YYYY")};
}


/**
 * Gets the start and end dates of the desired period and tax year
 * 
 * @param {number} period - The number of the period to look
 * @param {number} year - The Tax Year of the period
 * 
 * @returns A JSON object containing the start and end of the period
 */
export function getDatesOf(period, year) {
    // Get tax year start
    let taxStartYear = moment(taxStart).year(year - 1);
    
    // Set initial dates
    let startDate = moment(taxStartYear); // This is the date to be manipulated first
    let endDate;
    
    // Check the period depending on tax year
    if(taxStartYear.diff(startDate) > 0) taxStartYear = moment(taxStartYear).year(year - 1);

    // Divide the period in 2 and set the floor of the result to the months
    startDate = moment(startDate).add(Math.floor(period / 2), "M");

    // Get remainder of the period
    let rem = period % 2;

    if(rem == 0) {
        // Means it's the start of the month
        startDate = moment(startDate).startOf('month');
        endDate = moment(startDate).date(15);
    }
    else {
        // Means it's the end of the month
        startDate = moment(startDate).date(16);
        endDate = moment(startDate).endOf('month');
    }

    return {"startDate": moment(startDate).format("DD-MM-YYYY"), "endDate": moment(endDate).format("DD-MM-YYYY")};
}


/**
 * Changes the period displayed on the calculator
 * 
 * @param {number} chg - The number of the page to load
 */
export async function changePeriod(chg) {
    // Graph options
    const gConfig = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
                position: 'bottom',
            },
            title: {
                display: true,
                text: 'Minutes in this Period'
            }
        }
    }

    // Graph Data
    let gData = {
        labels: ['Scheduled', 'AP', 'Overtime', 'Training'],
        datasets: [{
            label: 'Minutes',
            data: [0, 0, 0, 0],
            backgroundColor: [
                'rgb(54, 162, 235)',
                'rgb(255, 99, 132)',
                'rgb(105, 205, 86)',
                '#64ffb1'
            ],
            borderWidth: 0,
            hoverOffset: 10,
            borderJoinStyle: "round"
        }]
    }

    // If parameter is lower than 0, don't do anything
    if(chg < 0) return;
    // If parameter is higher than the periods length, don't do anything
    if(chg >= validPeriods.length) return;

    // Set global variable
    selectedPeriod = chg;

    // Show Loading Curtain
    setLoading(true);

    // Set the state of the nav buttons
    if(selectedPeriod == 0) {
        if(validPeriods.length == 1) setNavButtons(0);
        else setNavButtons(2);
    }
    else if(selectedPeriod == validPeriods.length - 1) setNavButtons(1);
    else setNavButtons(3);

    // Get period's info
    let periodInfo = validPeriods[selectedPeriod];
    // Get period's start and end date
    let periodDate = getDatesOf(periodInfo.period, periodInfo.taxYear);
    
    // Change the name on the nav header
    document.getElementById("period-selector").innerHTML = "Period " + periodInfo.period;
    // Change the name on the card header
    document.getElementById("period-number").innerHTML = "Period " + periodInfo.period + " - " + periodInfo.taxYear;
    // Set the dates on the card subtitle
    document.getElementById("period-lapse").innerHTML = moment(periodDate.startDate, "DD-MM-YYYY").format("MMMM DD") + " - " + moment(periodDate.endDate, "DD-MM-YYYY").format("DD");

    // Get the card container
    const containerCalc = document.getElementById("calculator-tab-pane");
    
    // Count all minutes
    let counters = await countMinutes(periodDate);
    console.log(counters);

    // Load the payrates
    storage.loadJSON("/js/hr.json").then( (hr) => {
        storage.getDataFromLocalStorage("settings").then( (setting) => {

            // If no info yet, discard calculator
            if(!setting.type) return;
            
            // Save paycheck in variable
            let paycheck = hr.paycheck;

            let breakdown = {
                "rate": {
                    "schedule": +paycheck[setting.type]["L" + setting.level].rate,
                    "aex": +paycheck[setting.type].reported * paycheck.holiday.aex,
                    "mex": +paycheck[setting.type].reported * paycheck.holiday.mex,
                    "overtime": +paycheck[setting.type]["L" + setting.level].rate,
                    "ap": +paycheck[setting.type]["L" + setting.level].rate
                },
                "counter": {
                    "schedule": (counters.immediate + counters.training + counters.ap) / 60,
                    "aex": (counters.AEX) ? counters.AEX : 0,
                    "mex": (counters.MEX) ? counters.MEX : 0,
                    "overtime": counters.overtime / 60,
                    "ap": counters.ap / 60
                },
                "total": {
                    "schedule": 0,
                    "aex": 0,
                    "mex": 0,
                    "overtime": 0,
                    "ap": 0
                },
                "grandTotal": 0,
                "totalHours": 0
            }

            // Get totals
            breakdown.total.schedule = breakdown.rate.schedule * breakdown.counter.schedule;
            breakdown.total.aex = breakdown.rate.aex * breakdown.counter.aex;
            breakdown.total.mex = breakdown.rate.mex * breakdown.counter.mex;
            breakdown.total.overtime = breakdown.rate.overtime * breakdown.counter.overtime;
            breakdown.total.ap = breakdown.rate.ap * breakdown.counter.ap;

            // Get Grand Total
            let tot = breakdown.total;
            breakdown.grandTotal = tot.schedule + tot.aex + tot.mex + tot.overtime - tot.ap;
            breakdown.totalHours = breakdown.counter.schedule + breakdown.counter.overtime - breakdown.counter.ap; 


            // Display Rates
            containerCalc.querySelector("#rate-scheduled").innerHTML = "$" + (Math.round(breakdown.rate.schedule * 100) / 100).toFixed(2);
            containerCalc.querySelector("#rate-aex").innerHTML = "$" + (Math.round(breakdown.rate.aex * 100) / 100).toFixed(2);
            containerCalc.querySelector("#rate-mex").innerHTML = "$" + (Math.round(breakdown.rate.mex * 100) / 100).toFixed(2);
            containerCalc.querySelector("#rate-overtime").innerHTML = "$" + (Math.round(breakdown.rate.overtime * 100) / 100).toFixed(2);
            containerCalc.querySelector("#rate-discounts").innerHTML = "-$" + (Math.round(breakdown.rate.ap * 100) / 100).toFixed(2);
            
            // Load Info from Counters
            containerCalc.querySelector("#hrs-scheduled").innerHTML = breakdown.counter.schedule;
            containerCalc.querySelector("#hrs-aex").innerHTML = breakdown.counter.aex;
            containerCalc.querySelector("#hrs-mex").innerHTML = breakdown.counter.mex;
            containerCalc.querySelector("#hrs-overtime").innerHTML = (Math.round(breakdown.counter.overtime * 100) / 100).toFixed(2)
            containerCalc.querySelector("#hrs-discounts").innerHTML = "-" + breakdown.counter.ap;

            // Display Totals
            containerCalc.querySelector("#total-scheduled").innerHTML = "$" + (Math.round(breakdown.total.schedule * 100) / 100).toFixed(2);
            containerCalc.querySelector("#total-aex").innerHTML = "$" + (Math.round(breakdown.total.aex * 100) / 100).toFixed(2);
            containerCalc.querySelector("#total-mex").innerHTML = "$" + (Math.round(breakdown.total.mex * 100) / 100).toFixed(2);
            containerCalc.querySelector("#total-overtime").innerHTML = "$" + (Math.round(breakdown.total.overtime * 100) / 100).toFixed(2);
            containerCalc.querySelector("#total-discounts").innerHTML = "$" + (Math.round(breakdown.total.ap * 100) / 100).toFixed(2);

            containerCalc.querySelector("#total-hours").innerHTML = (Math.round(breakdown.totalHours * 100) / 100).toFixed(2);
            containerCalc.querySelector("#total-total").innerHTML = "$" + (Math.round(breakdown.grandTotal * 100) / 100).toFixed(2);
            containerCalc.querySelector("#total-paycheck").innerHTML = "$" + (Math.round(breakdown.grandTotal * 100) / 100).toFixed(2);

            // Set Graph data
            gData.datasets[0].data[0] = counters.immediate;
            gData.datasets[0].data[1] = counters.ap;
            gData.datasets[0].data[2] = counters.overtime;
            gData.datasets[0].data[3] = counters.training;

            // Get the canvas container
            const chartCt = document.getElementById('period-graph');
            // Create the chart
            if(!graphLoaded) graphLoaded = new Chart(chartCt, {type: 'doughnut', data: gData, options: gConfig});
            else {
                // Chart is already loaded, so just update the data
                graphLoaded.data = gData;
                // Refresh the chart
                graphLoaded.update();
            }

            // Hide Loading Curtain
            setLoading(false);
        });
        
    });
}


/**
 * Enables and disables the Navigation Buttons depending on the page the user is at.
 * It works using BitFlags, setting two bits as the direction of the buttons.
 * 00 (0): No buttons enabled,
 * 01 (1): Only right buttons enabled,
 * 10 (2): Only left buttons enabled,
 * 11 (3): Both sides enabled
 * 
 * @param {number} direction - The direction that the navigation buttons are going to be enabled or disabled.
 * 2 is left, 1 is right, 3 is both and 0 is none
 */
function setNavButtons(direction) {
    let right = ((direction & 2) != 2);
    let left = ((direction & 1) != 1);
    const containerCalc = document.getElementById("calculator-tab-pane");
    containerCalc.querySelector("#period-first").disabled = left;
    containerCalc.querySelector("#period-prev").disabled = left;
    containerCalc.querySelector("#period-next").disabled = right;
    containerCalc.querySelector("#period-last").disabled = right;
}


/**
 * Displays or hides the loading curtain in the calculator tab
 * 
 * @param {boolean} state - The state of the screen to be displayed
 */
function setLoading(state) {
    const loadingContainer = document.getElementById("calc-load");
    if(state) loadingContainer.classList.add("show");
    else loadingContainer.classList.remove("show");
}


/**
 * Counts the available, AP, additional and AEX minutes of the selected period
 * 
 * @param {object} periodDate - The  Object containing the dates of start and end of the period
 * @returns 
 */
async function countMinutes(periodDate) {
    // Store the loop Promises
    const dataPromises = [];

    // Set the temporary date
    let tmpDate = moment(periodDate.startDate, "DD-MM-YYYY");

    // Set the difference of days
    let dif = moment(periodDate.endDate, "DD-MM-YYYY").diff(tmpDate, "d");

    // Set the object for the counters
    let counters = {
        "immediate": 0,
        "ap": 0,
        "overtime": 0,
        "training": 0
    }

    /** Calendar container */
    const calCont = document.getElementById("registered-days");
    // Clear it
    calCont.innerHTML = "";

    // Create the first container
    let tr = document.createElement("tr");
    // Create the days before the period starts
    for(let u = 1; u < moment(tmpDate).format("d"); u++) {
        let td = document.createElement("td");
        td.innerHTML = " ";
        tr.append(td);
    }

    // Load the info of the period
    for (let i = 0; i < dif + 1; i++) {
        // Generate a new Promise for the data to load
        const promise = new Promise((resolve, reject) => {
            /** Calendar day element */
            let calDay = document.createElement("td");
            calDay.classList.add("text-center", "border");
            calDay.innerHTML = moment(tmpDate).add(i, 'days').format('DD');

            /** Counter for registries */
            let amt = 0;

            // Get the shift data of the day
            storage.getDataFromLocalStorage("shift-" + moment(tmpDate).add(i, 'days').format('DD-MM-YYYY')).then( shift => {
                storage.getDataFromLocalStorage("rec-" + moment(tmpDate).add(i, 'days').format('DD-MM-YYYY')).then( callReg => {
                    // Check if shift records are present
                    if(!shift.empty) {
                        // Add the bitFlag
                        amt += 1;
                        // Check if there's a Normal Shift
                        if(shift.type == "Normal") {
                            // Add the counters to the object
                            counters.immediate += shift.mins.immediate;
                            counters.ap += shift.mins.ap;
                            counters.training += shift.mins.training;
                        }
                        else {
                            // Check if it's a day off
                            if(shift.type == "Off") {
                                // Hide the text
                                calDay.classList.add("text-dark");
                                // Remove all bitFlags
                                amt = 0;
                            }

                            // No matches, get the type and save it as a key
                            if(!counters[shift.type]) counters[shift.type] = 1;
                            else counters[shift.type]++;
                        }
                    }
                    // Check if call records are present
                    if(!callReg.empty) {
                        amt += 2;
                    }

                    // Add color to the calendar days, depending on the value
                    if(amt == 3) calDay.classList.add("text-success"); // Both
                    else if(amt == 2) calDay.classList.add("text-warning"); // Only shift
                    else if(amt == 1) calDay.classList.add("text-info"); // Only calls
                    else calDay.classList.add("text-secondary"); // Nothing

                    // If there's calls and shift info, calculate the Overtime
                    if(amt == 3) {
                        // Check if it's not calculated yet
                        if(shift.mins.overtime == 0) {
                            // Calculate the overtime
                            counters.overtime += calculateOvertime(shift, callReg);
                        }
                    }

                    // Check if calendar row is at top
                    if(tr.childElementCount == 7) {
                        calCont.append(tr);
                        tr = document.createElement("tr");
                    }
                    // Add calendar day to calendar
                    tr.append(calDay);
                    
                    // Send the resolve to the promise
                    resolve(shift);
                });
            });
        });
        // Add the generated promise to the Promises array
        dataPromises.push(promise);
    }
    
    // Wait for all the Promises to get resolved
    await Promise.all(dataPromises);

    // Append the last row to the calendar
    calCont.append(tr);

    // Return the counters
    return counters;
}



function calculateOvertime(shiftInfo, callReg) {

    /** Additional seconds accumulator */
    let overtime = 0;

    for(let i = 0; i < callReg.calls.length; i++) {
        /** Call Start Time, minus 2 to be consistent with PST */
        let callStartTime = moment(callReg.calls[i].startTime, "HH:mm:SS").add(-2, "hours");

        /** Call End Time, minus 2 to be consistent with PST */
        let callEndTime = moment(callReg.calls[i].endTime, "HH:mm:SS").add(-2, "hours");

        /** Shift real end time */
        let shiftEndTime = moment(shiftInfo.shift.realEnd, "HH:mm:SS");

        /** Difference between the end of the shift and the end of the call, in milliseconds */
        let diff = callEndTime.diff(shiftEndTime);

        // Check if the call ended after the shift
        if(diff > 0) {

            // Check if the call started after the shift (Maybe all of them, except for the first one after the shift)
            if(callStartTime.diff(shiftEndTime) > 0) {

                // The call started and ended after the shift ended. So just add the duration
                overtime += callReg.calls[i].duration;
            }
            else {

                // The call started on the shift, but ended after. Count those minutes after
                overtime += callEndTime.diff(shiftEndTime, "seconds");

            }
        }
    }
    return overtime / 60;
}