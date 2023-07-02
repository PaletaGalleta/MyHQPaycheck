/**
 * File: periodhandler.js
 * Description: This file contains functions for calculating, creating and managing the payment periods, as well as calculating estimated income for each one of them.
 * Author: Luis Mario Estrada Pereyra
 * Date: 30-06-2023
 */

// Imports
import * as storage from "./storage.js";

/** Dec-16 constant (Tax Year Start) */
const taxStart = moment("16-12-2022", "DD-MM-YYYY");

/** Jan-01-2023 constant */
const yearStart = moment("01-01-2023", "DD-MM-YYYY");

/** The array for periods */
let validPeriods = [];

/** Variable for graph */
let graphLoaded = null;

/**
 * Loads all available periods of the user since the hiring date or 01/01/2023
 *
 * @param {string} since - The date in which the function will start counting, it must be in "DD-MM-YYYY" format. "null" for the start of the year
 */
export function loadPeriods(since = yearStart) {
    // Get the start date of the corresponding period
    let tmpYear = getPeriodOf(since).taxYear;
    let tmpPeriod = getPeriodOf(since).period;
    let tmpDate = moment(getDatesOf(tmpPeriod, tmpYear).startDate, "DD-MM-YYYY");

    // Cycle since the beginning
    while (tmpDate.diff(moment()) < 0) {
        // Get the period info
        let periodInfo = getPeriodOf(tmpDate);

        // Add it to the array
        validPeriods.push(periodInfo);

        // Get the date of the end of the period and add one day
        tmpDate = moment(getDatesOf(periodInfo.period, periodInfo.taxYear).endDate, "DD-MM-YYYY");
        tmpDate = moment(tmpDate).add(1, "d");
    }

    changePeriod(validPeriods.length - 1);
}

/**
 * Gets the period a date belongs to
 *
 * @param {moment} date - The date to parse
 *
 * @returns A JSON object containing the period number and the year the period belongs to (period and taxYear)
 */
export function getPeriodOf(date) {
    // Get tax year start depending on the date
    let taxYr = moment(date).year();
    let taxStartYear = moment(taxStart).year(taxYr);

    // Check the period depending on tax year
    if (date.diff(taxStartYear) < 0) taxStartYear = moment(taxStartYear).year(taxYr - 1);
    else taxYr++;

    // Get the difference in months since the start of the corresponding tax year
    let mths = date.diff(taxStartYear, "months");

    // Set the offset based on the half of the month, so 1-15 is 0 and 16-end is 1
    let offset = Math.floor(moment(date).date() / 16) == 0 ? 1 : 0;

    // Form the period according to the formula
    let period = mths * 2 + 1 + offset;

    // Return the object with the period and the tax year
    return { period: period, taxYear: +moment(taxStartYear).year(taxYr).format("YYYY") };
}

/**
 * Gets the start and end dates of the desired period and tax year
 *
 * @param {number} period - The number of the period to look
 * @param {number} year - The Tax Year of the period
 *
 * @returns A JSON object containing the start and end of the period (startDate and endDate)
 */
export function getDatesOf(period, year) {
    // Get tax year start
    let taxStartYear = moment(taxStart).year(year - 1);

    // Set initial dates
    let startDate = moment(taxStartYear); // This is the date to be manipulated first
    let endDate;

    // Check the period depending on tax year
    if (taxStartYear.diff(startDate) > 0) taxStartYear = moment(taxStartYear).year(year - 1);

    // Divide the period in 2 and set the floor of the result to the months
    startDate = moment(startDate).add(Math.floor(period / 2), "M");

    // Get remainder of the period
    let rem = period % 2;

    if (rem == 0) {
        // Means it's the start of the month
        startDate = moment(startDate).startOf("month");
        endDate = moment(startDate).date(15);
    } else {
        // Means it's the end of the month
        startDate = moment(startDate).date(16);
        endDate = moment(startDate).endOf("month");
    }

    return { startDate: moment(startDate).format("DD-MM-YYYY"), endDate: moment(endDate).format("DD-MM-YYYY") };
}

/**
 * Gets the estimations of a specific period
 *
 * @param {number} period - The number of the period to look
 * @param {number} year - The Tax Year of the period
 * @returns
 */
export function getPeriodInfo(period, year) {
    return new Promise(async (resolve, reject) => {
        // Get period's start and end date
        const periodDate = getDatesOf(period, year);

        // Count all minutes
        const counters = await countMinutes(periodDate);

        // Load the payrates
        storage.loadJSON("/js/hr.json").then(hr => {
            storage.getDataFromLocalStorage("settings").then(setting => {
                // If no info yet, discard calculator
                if (!setting.type) reject;

                // Save paycheck in variable
                const paycheck = hr.paycheck;

                const breakdown = {
                    rate: {
                        schedule: +paycheck[setting.type]["L" + setting.level].rate,
                        aex: +paycheck[setting.type].reported * paycheck.holiday.aex,
                        mex: +paycheck[setting.type].reported * paycheck.holiday.mex,
                        overtime: +paycheck[setting.type]["L" + setting.level].rate,
                        ap: +paycheck[setting.type]["L" + setting.level].rate,
                    },
                    counter: {
                        schedule: (counters.immediate + counters.training + counters.ap) / 60,
                        aex: counters.AEX ? counters.AEX : 0,
                        mex: counters.MEX ? counters.MEX : 0,
                        overtime: counters.overtime / 60,
                        ap: counters.ap / 60,
                    },
                    total: {
                        schedule: 0,
                        aex: 0,
                        mex: 0,
                        overtime: 0,
                        ap: 0,
                    },
                    grandTotal: 0,
                    totalHours: 0,
                };

                // Get totals
                breakdown.total.schedule = breakdown.rate.schedule * breakdown.counter.schedule;
                breakdown.total.aex = breakdown.rate.aex * breakdown.counter.aex;
                breakdown.total.mex = breakdown.rate.mex * breakdown.counter.mex;
                breakdown.total.overtime = breakdown.rate.overtime * breakdown.counter.overtime;
                breakdown.total.ap = breakdown.rate.ap * breakdown.counter.ap;

                // Get Grand Total
                const tot = breakdown.total;
                breakdown.grandTotal = tot.schedule + tot.aex + tot.mex + tot.overtime - tot.ap;
                breakdown.totalHours = breakdown.counter.schedule + breakdown.counter.overtime - breakdown.counter.ap;

                // Resolve the object
                resolve(breakdown);
            });
        });
    });
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
        immediate: 0,
        ap: 0,
        overtime: 0,
        training: 0,
    };

    // Load the info of the period
    for (let i = 0; i < dif + 1; i++) {
        // Generate a new Promise for the data to load
        const promise = new Promise((resolve, reject) => {
            /** Counter for registries */
            let amt = 0;

            // Get the shift data of the day
            storage.getDataFromLocalStorage("shift-" + moment(tmpDate).add(i, "days").format("DD-MM-YYYY")).then(shift => {
                storage.getDataFromLocalStorage("rec-" + moment(tmpDate).add(i, "days").format("DD-MM-YYYY")).then(callReg => {
                    // Check if shift records are present
                    if (!shift.empty) {
                        // Add the bitFlag
                        amt += 1;
                        // Check if there's a Normal Shift
                        if (shift.type == "Normal") {
                            // Add the counters to the object
                            counters.immediate += shift.mins.immediate;
                            counters.ap += shift.mins.ap;
                            counters.training += shift.mins.training;
                        } else {
                            // Check if it's a day off
                            if (shift.type == "Off") {
                                // Remove all bitFlags
                                amt = 0;
                            }

                            // No matches, get the type and save it as a key
                            if (!counters[shift.type]) counters[shift.type] = 1;
                            else counters[shift.type]++;
                        }
                    }
                    // Check if call records are present
                    if (!callReg.empty) {
                        amt += 2;
                    }

                    // If there's calls and shift info, calculate the Overtime
                    if (amt == 3) {
                        // Check if it's not calculated yet
                        if (shift.mins.overtime == 0) {
                            // Calculate the overtime
                            counters.overtime += calculateOvertime(shift, callReg);
                        }
                    }

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

    // Return the counters
    return counters;
}

function calculateOvertime(shiftInfo, callReg) {
    /** Additional seconds accumulator */
    let overtime = 0;

    for (let i = 0; i < callReg.calls.length; i++) {
        /** Call Start Time, minus 2 to be consistent with PST */
        let callStartTime = moment(callReg.calls[i].startTime, "HH:mm:SS").add(-2, "hours");

        /** Call End Time, minus 2 to be consistent with PST */
        let callEndTime = moment(callReg.calls[i].endTime, "HH:mm:SS").add(-2, "hours");

        /** Shift real end time */
        let shiftEndTime = moment(shiftInfo.shift.realEnd, "HH:mm:SS");

        /** Difference between the end of the shift and the end of the call, in milliseconds */
        let diff = callEndTime.diff(shiftEndTime);

        // Check if the call ended after the shift
        if (diff > 0) {
            // Check if the call started after the shift (Maybe all of them, except for the first one after the shift)
            if (callStartTime.diff(shiftEndTime) > 0) {
                // The call started and ended after the shift ended. So just add the duration
                overtime += callReg.calls[i].duration;
            } else {
                // The call started on the shift, but ended after. Count those minutes after
                overtime += callEndTime.diff(shiftEndTime, "seconds");
            }
        }
    }
    return overtime / 60;
}
