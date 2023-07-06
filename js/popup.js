/**
 * File: popup.js
 * Description: This file contains functions that will show on the extension's popup dialog
 * Author: Luis Mario Estrada Pereyra
 * Date: 30-06-2023
 */

// Imports
import * as storage from "./storage.js";
import * as period from "./periodhandler.js";

// Constants

/** Loading Timeout (in ms) */
const TIMEOUT = 5000;

// Element Constants
const loadingSection = document.getElementById("loading"); // Loading section
const errorSection = document.getElementById("error"); // Error section
const infoSection = document.getElementById("info"); // Info section

const settingsButton = document.getElementById("button-settings"); // Settings Button
const dashboardButton = document.getElementById("button-dashboard"); // Dashboard button

const lastCapturedCalls = document.getElementById("capture-calls"); // Last capture - Calls
const lastCapturedSchedule = document.getElementById("capture-schedule"); // Last capture - Schedule
const periodInfoCont = document.getElementById("period-info"); // Period Info (number and year)
const periodDatesCont = document.getElementById("period-dates"); // Period Dates (start and end)
const paycheckPesos = document.getElementById("paycheck"); // Estimated Paycheck - pesos
const paycheckCents = document.getElementById("paycheck-cents"); // Estimated Paycheck - cents

/** Loading timer */
let loadingTimer;

// Hide error and info
errorSection.classList.add("d-none");
infoSection.classList.add("d-none");

// Click handlers for settings and dashboard
settingsButton.addEventListener("click", () => {
    chrome.tabs.query({ url: chrome.runtime.getURL("options.html") }, tabs => {
        if (tabs.length === 0) chrome.tabs.create({ url: chrome.runtime.getURL("options.html#settings") });
    });
});
dashboardButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

/**
 * @async
 *
 * Initializes the popup's functionality
 */
async function initialize() {
    // Start timer
    loadingTimer = setTimeout(showError, TIMEOUT);

    // Get settings
    const settings = await storage.getDataFromLocalStorage("settings");

    // Fetch the date of the last calls capture
    lastCapturedCalls.innerHTML = settings.lastCapturedCalls ? settings.lastCapturedCalls : "Unknown";

    // Fetch the date of the last schedule capture
    lastCapturedSchedule.innerHTML = settings.lastCapturedSchedule ? settings.lastCapturedSchedule : "Unknown";

    // Get estimated paycheck for this period
    const periodInfo = period.getPeriodOf(moment(new Date()));
    const periodDates = period.getDatesOf(periodInfo.period, periodInfo.taxYear);
    const paycheckInfo = await period.getPeriodInfo(periodInfo.period, periodInfo.taxYear);

    periodInfoCont.innerHTML = `Period ${periodInfo.period} - ${periodInfo.taxYear}`;

    // Format the period dates
    const dateStart = moment(periodDates.startDate, "DD-MM-YYYY");
    const dateEnd = moment(periodDates.endDate, "DD-MM-YYYY");
    let periodDatesTxt = "";

    if (dateStart.format("MMYY") == dateEnd.format("MMYY"))
        periodDatesTxt += `${dateStart.format("MMMM DD")}-${dateEnd.format("DD")}`;
    else periodDatesTxt += `${dateStart.format("MMMM DD")} to ${dateEnd.format("MMMM DD")}`;

    periodDatesCont.innerHTML = periodDatesTxt;

    const formattedValue = paycheckInfo.grandTotal.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
    });

    const [units, cents] = formattedValue.split(".");
    paycheckPesos.innerHTML = units;
    paycheckCents.innerHTML = cents;

    // Hide loading and error sections
    loadingSection.classList.add("d-none");
    errorSection.classList.add("d-none");
    // Show info section
    infoSection.classList.remove("d-none");

    // Clear timeout if possible
    if (loadingTimer) clearTimeout(loadingTimer);
}
initialize();

/**
 * Hides all shown sections and then displays the error section
 */
function showError() {
    // Hide loading and info sections
    loadingSection.classList.add("d-none");
    infoSection.classList.add("d-none");
    // Show error section
    errorSection.classList.remove("d-none");
    // Clear timeout if possible
    if (loadingTimer) clearTimeout(loadingTimer);
}
