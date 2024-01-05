/**
 * File: storage.js
 * Description: This file contains functions for getting and setting data from storage.
 * Author: Luis Mario Estrada Pereyra
 * Date: 09-02-2023
 */

// Imports
import * as storage from "./storage.js";
import * as notifications from "./notifications.js";
import * as achievements from "./achievement.js";
import * as ShiftController from "./Shift.js";

// Constants
export const settingsVersion = 3;
export const sysDev = true;

// Import input
let importInput;
let importLabel;

// Checkbox variables
let exportAll;
let exportSettings;
let exportCalls;
let exportShifts;
let exportPaycheck;

let exportArray = [exportSettings, exportCalls, exportShifts, exportPaycheck];

// Button Variables
let importButton;
let importButtonOverride;
let exportButton;

/**
 * Saved Settings container
 */
export let savedSettings = {loading: true};

/**
 * Beta Modal reference
 */
let betaModal;

/**
 * Settings Initializer
 */
export function load() {
    // Create the Beta modal
    betaModal = new bootstrap.Modal("#betaModal", {keyboard: false, focus: true, backdrop: "static"});

    // Get settings storage
    storage.getDataFromLocalStorage("settings").then(value => {
        console.log(value); // DEBUG

        // Check if info is already present
        if (!value.empty) {
            // Get saved settings
            savedSettings = value;

            // Check if version matches with the one that is needed
            if (savedSettings.settingsversion < settingsVersion) {
                // Version mismatched
                console.log("Settings Version mismatch or incomplete information");
                console.log("Saved version: " + savedSettings.settingsversion + ", current version:" + settingsVersion);
                document.getElementById("missinginfo").style.display = "flex";
                document.getElementById("settings-tab").click();
            }

            // Display the info available
            document.getElementById("email").value = savedSettings.email ? savedSettings.email : "";
            document.getElementById("nickname").value = savedSettings.nickname ? savedSettings.nickname : "";
            if (savedSettings.level != undefined) document.getElementById("radiolevel" + savedSettings.level).checked = true;
            if (savedSettings.type != undefined) document.getElementById("radiotype" + savedSettings.type).checked = true;
            document.getElementById("startwork").value = savedSettings.jobStart
                ? moment(savedSettings.jobStart, "DD-MM-YYYY").format("YYYY-MM-DD")
                : "";
            document.getElementById("checkdev").checked = savedSettings.devmode ? true : false;
            document.getElementById("welcome").innerHTML = savedSettings.nickname
                ? "Welcome, " + savedSettings.nickname
                : "Welcome, User";
        } else {
            savedSettings = {};
            document.getElementById("missinginfo").style.display = "flex";
            showBetaModal(true);
        }
    });

    // Add listener for form submission
    document.getElementById("settingsform").addEventListener(
        "submit",
        function (evt) {
            evt.preventDefault();
            saveInfo();
        },
        true
    );

    // Import input
    importInput = document.getElementById("import-file");
    importLabel = document.getElementById("import-label");

    // Checkbox variables
    exportAll = document.getElementById("export-all");
    exportSettings = document.getElementById("export-settings");
    exportCalls = document.getElementById("export-calls");
    exportShifts = document.getElementById("export-shifts");
    exportPaycheck = document.getElementById("export-paycheck");

    exportArray = [exportSettings, exportCalls, exportShifts, exportPaycheck];

    // Button Variables
    importButton = document.getElementById("import-button");
    importButtonOverride = document.getElementById("import-button-override");
    exportButton = document.getElementById("export-button");

    // Listeners
    importInput.addEventListener("change", importHandler);
    exportAll.addEventListener("change", exportHandler);
    exportSettings.addEventListener("change", exportHandler);
    exportCalls.addEventListener("change", exportHandler);
    exportShifts.addEventListener("change", exportHandler);
    exportPaycheck.addEventListener("change", exportHandler);

    exportButton.addEventListener("click", exportData);
    importButton.addEventListener("click", importData);
    importButtonOverride.addEventListener("click", () => {
        storage.importData(savedSettings.email, true).then(res => {
            if (res) notifications.showToast("Records Imported Succesfully", "info");
        });
    });

    // Check Convert
    checkConvert();
}

/**
 * Function to handle the "Early Access" fullscreen modal
 *
 * @param {boolean} state - The state of the modal: 'true' if show, 'false' if hide
 */
function showBetaModal(state) {
    // Actions depending on state
    if (state) {
        document.getElementById("verify-email").addEventListener("click", verifyEmail);
        betaModal.show();
    } else betaModal.hide();
}

/**
 * Function to verify the input email
 */
function verifyEmail() {
    // Get Email
    const email = document.getElementById("emailverif").value;

    // Create encrypted version
    sha256(email).then(hash => {
        const emailenc = hash;

        // Get allowed emails
        storage.loadJSON("/js/hr.json").then(val => {
            // Cycle through allowed emails
            for (let i = 0; i < val.validEmails.length; i++) {
                // Check for coincidences
                if (emailenc == val.validEmails[i]) {
                    // Set email in settings
                    document.getElementById("email").value = email;
                    // Lock the email
                    document.getElementById("email").disabled = true;
                    // Welcome the user
                    notifications.showToast(
                        "Welcome, " + email + "! You have unlimited access to the Beta Version, enjoy!",
                        "success"
                    );
                    savedSettings["email"] = email;
                    // Hide Modal
                    showBetaModal(false);
                    // Exit
                    return;
                }
            }
            // Function didn't exit, so no coincidences
            notifications.showToast(
                "Sorry, the email didn't get any coincidences. Be sure to type the email you registered for the Beta, and remember to type it in lowercase",
                "danger"
            );
        });
    });
}

/**
 * Encodes the desired string into a SHA256 string
 *
 * @param {string} input - The string to encode
 * @returns
 */
async function sha256(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    return crypto.subtle.digest("SHA-256", data).then(buffer => {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ("00" + x.toString(16)).slice(-2)).join("");
    });
}

/**
 * Saves the info on the form to LocalStorage
 */
function saveInfo() {
    // Get Email
    savedSettings.email = document.getElementById("email").value;

    // Get Nickname
    savedSettings.nickname = document.getElementById("nickname").value;

    // Get Level
    savedSettings.level = document.getElementById("radiolevels").querySelector(".btn-check:checked").value;

    // Get Salary Type
    savedSettings.type = document.getElementById("radiotypes").querySelector(".btn-check:checked").value;

    // Get Job Begin Date
    let strtJb = document.getElementById("startwork").value;
    if (strtJb != "") {
        savedSettings.jobStart = moment(strtJb, "YYYY-MM-DD").format("DD/MM/YYYY");
        if (moment().diff(moment(savedSettings.jobStart, "DD/MM/YYYY"), "days") >= 365)
            achievements.setProgress("oneYear", 365, true);
    } else savedSettings.jobStart = "";

    // Get DevMode
    savedSettings.devmode = document.getElementById("checkdev").checked;

    // Get Installation date
    if (!savedSettings.installdate) {
        // New installation!
        savedSettings.installdate = moment().format("DD/MM/YYYY");
        // Unlock install achievement
        achievements.setProgress("ocd", 1);
    }

    // Unlock Specialist achievement for day 1
    achievements.setProgress("100", 1, true);

    // Unlock Level achievements
    for (let i = 3; i <= savedSettings.level; i++) achievements.setProgress("ml" + i, 1);

    // Update to new Settings Version
    savedSettings.settingsversion = settingsVersion;

    // Save settings
    saveSettings().then(() => {
        // Show toast
        notifications.showToast("Settings Saved", "success");
        // Hide the red square
        document.getElementById("missinginfo").style.display = "none";
        // Go to the dashboard and reload the tabs
        document.getElementById("reload-dashboard").click();
        document.getElementById("dashboard-tab").click();
    });
}

/**
 * Function to save settings in the system
 */
export async function saveSettings() {
    // Save settings
    return new Promise(resolve => {
        chrome.storage.local.set({settings: savedSettings}).then(() => {
            resolve();
        });
    });
}

function exportHandler(checkbox) {
    // Get checkbox
    const check = checkbox.target;

    // Checked counter
    let chkAmt = 0;

    // "All" checkbox
    if (check.id === "export-all") {
        exportArray.forEach(chck => {
            chck.checked = check.checked;
        });
        if (check.checked) chkAmt++;
    }
    // The rest of the checkboxes
    else {
        // Flag
        let fl = 0;
        exportArray.forEach(chck => {
            if (!chck.checked) fl++;
            else chkAmt++;
        });
        exportAll.checked = fl == 0;
    }

    exportButton.disabled = chkAmt == 0;
}

function exportData(e) {
    e.preventDefault();
    if (exportAll.checked) achievements.setProgress("backup", 1);
    storage.exportData().then(res => {
        if (res) {
            notifications.showToast("Export file created. Check Downloads folder", "info");
        }
    });
}

function importHandler() {
    // Verify that the file is ready
    if (importInput.files[0].name != "") {
        // Read content of the file
        importLabel.innerHTML = "Abriendo archivo...";
        const selectedFile = importInput.files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            const fileContent = event.target.result;

            importLabel.innerHTML = "Verificando Información...";

            try {
                // Parse to JSON
                const backupData = JSON.parse(fileContent);
                // Verify the backup date
                const today = moment();
                const backupDate = moment(backupData.backup.date, "DD-MM-YYYY");
                console.log(today.diff(backupDate, "days"));

                let infoString = "Backup Date: " + backupData.backup.date;

                infoString += ", Settings: ";
                infoString += backupData.settings ? "YES" : "NO";

                // Read all keys
                const keys = Object.keys(backupData);
                let recs = 0;
                let shifts = 0;
                let periods = 0;
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];

                    // Get recs
                    if (key.startsWith("rec-")) recs += backupData[key].calls.length;
                    // get schedules
                    if (key.startsWith("shift-")) shifts++;
                    // Get periods
                    if (key.startsWith("per-")) periods++;
                }

                infoString += ", Calls: ";
                infoString += recs > 0 ? recs : "NO";

                infoString += ", Shifts: ";
                infoString += shifts > 0 ? shifts : "NO";

                infoString += ", Paycheck Periods: ";
                infoString += periods > 0 ? periods : "NO";

                // Enable button
                importButton.disabled = false;
                importLabel.innerHTML = infoString;
                console.log(backupData);
            } catch (e) {
                importLabel.innerHTML = "¡Archivo no válido!";
                importButton.disabled = true;
            }
        };

        reader.readAsText(selectedFile);
    } else importButton.disabled = true;
}

function importData(e) {
    e.preventDefault();
    storage.importData(savedSettings.email).then(res => {
        if (res) notifications.showToast("Records Imported Succesfully", "info");
    });
}

function checkConvert() {
    // Check if calls are already converted, by checking the settings flag
    const isConverted = savedSettings.callsConverted;
    if (!isConverted || isConverted != 1) {
        // If not, convert them
        convertCalls();
    }
}
async function convertCalls() {
    // Get object keys
    chrome.storage.local.get(null).then(data => {
        const keys = Object.keys(data);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            // Get recs
            if (key.startsWith("rec-")) {
                // Save the date and create a call if not needed
            }
            // get schedules
            if (key.startsWith("shift-")) {
            }

            objectData[key] = data[key];
        }

        resolve(true);
    });
}
