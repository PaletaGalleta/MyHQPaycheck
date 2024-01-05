/**
 * File: option.js
 * Description: This file contains functions for managing the Calculator and Paycheck Pages in MyHQPaycheck.
 * Author: Luis Mario Estrada Pereyra
 * Date: 01-02-2023
 */

// Imports
import * as dashboardModule from "./dashboard.js";
import * as calculatorModule from "./calculator.js";
import * as notifications from "./notifications.js";
import * as settingsModule from "./settings.js";
import * as milestonesModule from "./milestones.js";
import * as achievementModule from "./achievement.js";
import * as storage from "./storage.js";

/** Current tab */
let currentTab = 0;

/** Tab names constants */
const tabNames = ["dashboard", "calculator", "paycheck", "milestones", "settings", "about", "pro"];

/** Constant for today */
const now = moment();

/** JSON Constants container */
let hr;

/*
 * On loaded content
 */
document.addEventListener("DOMContentLoaded", load);

/**
 * Load all the content
 */
function load() {
    // Load Listeners
    const tabs = document.querySelectorAll("[id$='-tab']");
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener("click", () => {
            tabClick(i);
        });
    }
    // Check for parameters
    if (window.location.href.split("?")[1]) {
        let param = window.location.href.split("?")[1];
        // Get name and value
        let key = param.split("=")[0];
        let value = param.split("=")[1];

        // Move this later to a custom function PLZ
        switch (key) {
            case "update":
                achievementModule.setProgress("update", 1);
                break;
            case "100days":
                achievementModule.setProgress("100", 100, true);
                break;
            case "365days":
                achievementModule.setProgress("oneYear", 365, true);
                break;
        }
    }
    // Check for hashes
    console.log();
    if (window.location.hash) {
        let hash = window.location.hash.split("?")[0];
        // Hash exists, change to that tab
        for (var i = 0; i < tabNames.length; i++) {
            if (hash == "#" + tabNames[i]) {
                try {
                    document.getElementById(tabNames[i] + "-tab").click();
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }

    // Get Constants information
    storage.loadJSON("/js/hr.json").then(data => {
        // Save Achievements on variable
        hr = data;

        // Get manifest data
        let manifestData = chrome.runtime.getManifest();

        // Set badges Text and color, depending on the current version
        let verType = manifestData.version_name.split("-")[1];

        const lrgbdg = document.getElementById("versionbadge-long");
        const shtbdg = document.getElementById("versionbadge-short");

        lrgbdg.innerHTML = hr.extension.versiondata[verType].text;
        lrgbdg.style.backgroundColor = hr.extension.versiondata[verType].color;
        shtbdg.innerHTML = hr.extension.versiondata[verType].shortText;
        shtbdg.style.backgroundColor = hr.extension.versiondata[verType].color;

        // Set version in the bottom
        document.getElementById("version").innerHTML = "v" + manifestData.version;
    });

    // Initialize settings
    settingsModule.load();
    // Initialize dashboard
    dashboardModule.Init();
    // Initialize calculator and Paycheck
    calculatorModule.init();
    // Initialize About page (changelog)
    loadChangelog();
}

/**
 * Function for Loading the changelog JSON file and displaying it on the About page, below the Information card
 *
 */
function loadChangelog() {
    // Get changelog JSON info
    storage.loadJSON("/js/changelog.json").then(data => {
        // Save changelog on constant
        let changelog = data;
        changelog = changelog.changelog;

        // Get the HTML container
        const container = document.getElementById("changelog-container");

        let currentMark = false;

        // Loop for every version found in JSON file
        for (let key = 0; key < changelog.length; key++) {
            // Get version info
            var ver = changelog[key];

            // Create and configure the card div
            var card = document.createElement("div");
            card.classList.add("card", "mb-3");

            // Create and configure the card header
            var hdr = document.createElement("h5");
            hdr.classList.add("card-header");
            hdr.innerHTML = "Version " + ver.version;

            // Create and configure the card body
            var bdy = document.createElement("div");
            bdy.classList.add("card-body");

            // Format the date
            let date = moment(ver.date, "DD-MM-YYYY").fromNow() + " (" + ver.date + ")";
            if (moment(ver.date, "DD-MM-YYYY").diff(now) > 0) card.classList.add("border", "border-success");
            else if (!currentMark) {
                card.classList.add("border", "border-info");
                currentMark = true;
            }

            // Create and configure the version date
            var dat = document.createElement("p");
            dat.classList.add("card-text", "text-muted");
            dat.innerHTML = date;

            // Create and configure the version changes list
            var list = document.createElement("ul");

            // If there are no changes (yet), display it and continue
            if (ver.changes.length == 0) {
                var op = document.createElement("li");
                op.classList.add("card-text");
                op.innerHTML = "No changes listed";
                list.append(op);
                continue;
            }

            for (let i = 0; i < ver.changes.length; i++) {
                var op = document.createElement("li");
                op.classList.add("card-text");
                op.innerHTML = ver.changes[i];
                list.append(op);
            } // end-for

            // Append card to container
            bdy.append(dat);
            bdy.append(list);
            card.append(hdr);
            card.append(bdy);
            container.append(card);
        } // end-for
    });
}

/**
 * Event handler for clicked tabs
 *
 * @param {number} id - The ID of the clicked tab
 */
function tabClick(id) {
    if (currentTab != id) {
        if (!settingsModule.savedSettings.loading && !settingsModule.savedSettings.email) {
            document.getElementById("settings-tab").click();
            return;
        }
        currentTab = id;

        switch (id) {
            case 2:
                calculatorModule.loadPeriods();
                break;
            case 3:
                // Initialize milestones
                milestonesModule.load();
                break;
            case 6:
                // Load Feedback Form
                document.getElementById("feedback-form").src =
                    "https://docs.google.com/forms/d/e/1FAIpQLSfVzqj4RN8Jpa_xlWPrZxNiyUMX7KrnkLlLYF4ulzt13kEX7Q/viewform?embedded=true";
                break;
        }
    }
    scroll(0, 0);
}

/**
 * Test Functions
 */
function Test() {
    storage.loadJSON("/js/test.json").then(value => {
        /*
        POSSIBLE ANSWER
        ((immediateHrs * ap / scheduledInOffice) - (exceptionsInOffice - unapproved)) / (unapproved * scheduledInOffice) + immediateHrs
         */
        console.log("------ DEBUG START ------");
        let acu = {
            unapproved: 0,
            scheduledInOffice: 0,
            exceptionsInOffice: 0,
        };

        for (let i = 0; i < value.unapproved.length; i++) {
            acu.unapproved += +value.unapproved[i].split(":")[1] + +value.unapproved[i].split(":")[0] * 60;
            acu.scheduledInOffice += +value.scheduledInOffice[i].split(":")[1] + +value.scheduledInOffice[i].split(":")[0] * 60;
            acu.exceptionsInOffice +=
                +value.exceptionsInOffice[i].split(":")[1] + +value.exceptionsInOffice[i].split(":")[0] * 60;
        }
        acu.unapproved = acu.unapproved / 60;
        acu.scheduledInOffice = acu.scheduledInOffice / 60;
        acu.exceptionsInOffice = acu.exceptionsInOffice / 60;
        console.log(acu);
        console.log("------ DEBUG END ------");
    });

    let unapproved = 41.35;
    let scheduledInOffice = 84.5;
    let immediateHrs = 68.25;
    let ap = 16.25;
    let exceptionsInOffice = 32.3;
}
