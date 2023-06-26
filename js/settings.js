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

// Constants
export const settingsVersion = 3;
export const sysDev = true;

/**
 * Saved Settings container
 */
export let savedSettings = { loading: true };

/**
 * Beta Modal reference
 */
let betaModal;

/**
 * Settings Initializer
 *
 */
export function load() {
    // Create the Beta modal
    betaModal = new bootstrap.Modal("#betaModal", { keyboard: false, focus: true, backdrop: "static" });

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
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ settings: savedSettings });
        resolve();
    });
}
