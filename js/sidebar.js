/**
 * File: sidebar.js
 * Description: This file contains functions for managing the Milestones Page in MyHQPaycheck.
 * Author: Luis Mario Estrada Pereyra
 * Date: 24-02-2023
 */

/** Notifications variable */
let notifications;

/** Providers Variable */
let providers;

/** Minimum duration for a call to be considered a short call */
const minDuration = 150;

/** The period in minutes where the short calls get registered for it to be considered work avoidance and lock pins */
const shortCallsMins = 30;

/** Saves counter */
let savedCalls = 0;

/**
 * Get Notifications
 */
(async () => {
    const src = chrome.runtime.getURL("js/notifications.js");
    notifications = await import(src);
})();

// Add sidebar to Page
const sidebar = document.querySelector("#sidebarDiv");
const sidebarPanel = document.createElement("div");
sidebarPanel.classList.add("sidebarModule");
sidebarPanel.id = "sd-panel";
sidebarPanel.innerHTML = `
    <div class="sidebarModuleHeader brandPrimaryBgr"><h2 class="brandPrimaryFgr">MyHQ Paycheck</h2></div>
    <div id="sd-body" class="sidebarModuleBody">
        <span id="sd-status">No Results</span>
        <br>
        <button id="sd-getinfo">Save Call Records</button>
    </div>
`;
sidebar.append(sidebarPanel);

// Add click listener for getting call reg
document.getElementById("sd-getinfo").addEventListener("click", getInfo);

// Get providers info
(async () => {
    chrome.storage.local.get(["providers"], function (result) {
        const objectResult = result["providers"];
        providers = objectResult ? objectResult : {};
    });
})();

/**
 * Function to get info from rows
 *
 */
function getInfo() {
    /** Current date (cache) */
    let currentDate = "0";

    /** Array for the info of each call */
    let callInfo = [];

    /** Scrape Table */
    const CallTB = document.querySelector("table .list");

    /** The rows of the table */
    let rowLength = CallTB.rows.length;
    console.log(rowLength + " call records found");

    savedCalls = 0;

    // Loop through calls
    for (i = rowLength - 1; i > 0; i--) {
        /** Object for the calls of the day */
        let callDay = {
            startTime: "",
            endTime: "",
            account: "",
            language: "",
            duration: "",
            report: false,
        };

        /** Calls in the row */
        let oCells = CallTB.rows.item(i).cells;

        // Get info from cell 2 (Call Report)
        let rep = oCells.item(2).innerHTML;
        if (rep == "Yes") callDay.report = true;

        // Get info from cell 4 (Start Time)
        var strt = oCells.item(4).innerHTML.replace(/\&nbsp;/g, "");
        var startTime = moment(strt, "MM-DD-YYYY hh:mm:ss A");

        // Get info from cell 5 (End Time)
        var end = oCells.item(5).innerHTML.replace(/\&nbsp;/g, "");
        var endTime = moment(end, "MM-DD-YYYY hh:mm:ss A");

        // Get info from cell 6 (Account)
        var acct = oCells.item(6).innerHTML.replace(/,/g, "");

        // Get info from cell 7 (Language)
        var lang = oCells.item(7).innerHTML.replace(/,/g, "");

        // Get info from cell 8 (Duration)
        var dur = oCells.item(8).innerHTML.replace(/,/g, "");

        // Get date from start
        var startDate = moment(startTime).format("DD-MM-YYYY");

        // Check if date is on cache
        if (currentDate != startDate) {
            // Date not in cache, check if its first run or day change
            if (currentDate != "0") {
                // Its day change, save the previous object
                saveDay(currentDate, callInfo);
                // Create new CallRec
                callInfo = [];
            }
            // Update the date in cache
            currentDate = startDate;
        }

        // Save row info in object
        callDay.startTime = moment(startTime).format("HH:mm:ss");
        callDay.endTime = moment(endTime).format("HH:mm:ss");
        callDay.account = acct;
        callDay.duration = +dur;
        callDay.language = lang;

        // Save object in array
        callInfo.push(callDay);
    }

    // Save Day
    saveDay(currentDate, callInfo);

    // Save providers
    saveProviders();
    // Update the sidebar
    updateSidebar("Saved " + rowLength + " calls");

    if (savedCalls > 0) notifications.showToast(rowLength + " call records found. " + savedCalls + " days updated");
    else notifications.showToast(rowLength + " call records found. No changes detected");
}

/**
 * Function for saving and Processing the info for each day
 *
 * @param {string} date - The date for saving
 * @param {Array} calls - The array of calls which will be saved
 *
 */
function saveDay(date, calls) {
    // Check if call record already exists
    chrome.storage.local.get("rec-" + date, result => {
        // Get the records
        let ach = result["rec-" + date];

        // Check if theres already a record saved on file
        if (ach) {
            // Check if the amount of calls is the same
            if (ach.calls.length == calls.length) return; // Don't save anything
        }

        // Generate DayRecords object
        let dayRecords = {
            calls: calls,
            reports: 0,
        };

        // Create counters
        let totalDuration = 0;
        let highestDuration = 0;
        let lowestDuration = 99999;
        let shortCalls = [];
        let availableTime = 0;

        // Iterate through calls
        for (var i = 0; i < dayRecords.calls.length; i++) {
            // Shortcut to duration
            let dur = dayRecords.calls[i].duration;

            // Get time between calls
            if (i > 0) {
                let tim = moment(dayRecords.calls[i].startTime, "HH:mm:ss").diff(
                    moment(dayRecords.calls[i - 1].endTime, "HH:mm:ss"),
                    "seconds"
                );
                availableTime += tim;
            }

            // Add duration to totals
            totalDuration += dur;

            // Unlock devil achievement
            if (totalDuration / 60 > 666) {
                UnlockAchievement("devil", date, dayRecords.calls[i].endTime, 666);
            }

            // Check if it's higher
            if (dur > highestDuration) highestDuration = dur;

            // Check if it's lower
            if (dur < lowestDuration) lowestDuration = dur;

            // Check if duration is less than permitted time for shortcalls
            if (dur < minDuration) {
                // Check if it's the first short call of the day
                if (shortCalls.length > 0) {
                    // There's at least one short call in the list

                    let miniCtr = 0; // Counter for calls that need to be disposed

                    // Cycle between short calls
                    for (let s = 0; s < shortCalls.length; s++) {
                        if (
                            moment(dayRecords.calls[i].startTime, "HH:mm:ss").diff(moment(shortCalls[s], "HH:mm:ss"), "minutes") >
                            shortCallsMins
                        ) {
                            // It's not in the half hour range anymore, increase the counter
                            miniCtr++;
                        } else break; // No need to check again
                    }

                    // Delete the calls from the counter
                    while (miniCtr > 0) {
                        shortCalls.shift();
                        miniCtr--;
                    }
                }
                // Add the short call
                shortCalls.push(dayRecords.calls[i].startTime);

                // Check if short call amount is 5
                if (shortCalls.length >= 5) UnlockAchievement("pinLocked", date, dayRecords.calls[i].startTime);
                // Check if short call amount is 4
                else if (shortCalls.length == 4) UnlockAchievement("pinAlmostLocked", date, dayRecords.calls[i].startTime);

                // Check if duration is 1 second
                if (dur == 1) UnlockAchievement("onesec", date, dayRecords.calls[i].startTime);

                // Check if duration is 0 seconds
                if (dur == 0) UnlockAchievement("zerosec", date, dayRecords.calls[i].startTime);
            }

            // Check if the call was in another language
            if (dayRecords.calls[i].language != "SPANISH") UnlockAchievement("otherlang", date, dayRecords.calls[i].startTime);

            // Increase the counter if call reports is YES
            if (dayRecords.calls[i].report) dayRecords.reports++;

            // Delete the language field
            delete dayRecords.calls[i].language;

            // Get the providers info and send it to the function
            addProvider(dayRecords.calls[i].account, dur);

            // Delete the provider field
            delete dayRecords.calls[i].account;
        }

        // Save counters
        let avgDuration = Math.trunc(totalDuration / dayRecords.calls.length);
        dayRecords.avgDuration = moment().startOf("day").second(avgDuration).format("HH:mm:ss");
        dayRecords.totalDuration = moment().startOf("day").second(totalDuration).format("HH:mm:ss");
        dayRecords.highestDuration = moment().startOf("day").second(highestDuration).format("HH:mm:ss");
        dayRecords.lowestDuration = moment().startOf("day").second(lowestDuration).format("HH:mm:ss");
        dayRecords.availableTime = availableTime;

        // Save object on file
        var kKey = "rec-" + date;
        chrome.storage.local.set({ [kKey]: dayRecords }).then(() => {
            notifications.showToast("Calls Saved on file succesfully - Date: " + date);
            savedCalls++;
        });
    });
}

/**
 * Display a custom message on the sidebar
 *
 * @param {string} msg - The message on the sidebar
 */
function updateSidebar(msg) {
    // Get status area
    let status = document.querySelector("#sd-status");

    // Update status
    status.innerHTML = msg;
}

/**
 * Light function for unlocking a specific achievement
 *
 * @param {string} name - The codename of the achievement
 * @param {string} date - The date of the achievement unlock
 * @param {string} time - The time of the achievement unlock
 * @param {number} value - The value of the achievement progress
 */
function UnlockAchievement(name, date, time, value = 1) {
    // Create object
    let tmp;

    // Load json achievements
    let unlockedAchievements = {};
    let achievements = {};

    chrome.storage.local.get(["achievements"], result => {
        const uAch = result["achievements"];

        // Get extension's url
        const extensionUrl = chrome.extension.getURL("");
        fetch(extensionUrl + "/js/achievements.json").then(val => {
            val.json().then(jj => {
                const jsonAch = jj;

                // Create achievement skeleton
                tmp = {
                    progress: 0,
                    unlockDate: "",
                    seen: false,
                };

                if (!uAch.empty) {
                    unlockedAchievements = uAch;
                }

                // Save objects
                achievements = jsonAch;

                // Check if achievement exists
                if (unlockedAchievements[name]) {
                    // Check if its already unlocked
                    if (unlockedAchievements[name].unlockDate == "") {
                        // Not unlocked yet. Get info
                        tmp = unlockedAchievements[name];

                        // Check if the function needs to check if the new value is higher than current
                        if (tmp.progress >= value) return; // Progress is lower than current, exit
                    } else return; // Achievement already unlocked, dont do anything
                }

                // Check if achievement exists in the list
                if (achievements[name]) {
                    // Check if new value is between limits of the goal of the achievement
                    if (value < 0) {
                        // Value is negative, set it to 0
                        tmp.progress = 0;
                    } else if (value >= achievements[name].goal) {
                        // Value exceeds or is equal to the achievement goal (good boy!)
                        // Unlock it!
                        tmp.progress = achievements[name].goal;
                        let dateTime = date + " " + time;
                        tmp.unlockDate = moment(dateTime, "DD-MM-YYYY HH:mm:SS").format("DD-MM-YYYY HH:mm");
                    } else {
                        // Value is set, but it's not unlocked yet
                        tmp.progress = value;
                    }

                    // Add temporary skeleton to the list
                    unlockedAchievements[name] = tmp;

                    // Save list on local storage
                    chrome.storage.local.set({ achievements: unlockedAchievements }).then(() => {
                        console.log("Achievement list updated");
                        console.log(unlockedAchievements);
                    });
                } else {
                    // Achievement not valid, exit
                    console.log("Achievement -" + name + "- not present in the JSON");
                }
            });
        });
    });
}

/**
 * Adds the specified provider to the providers list. The name gets converted to lowercase to set up a key
 *
 * @param {string} name - The name of the provider, in normal form
 * @param {number} duration - The duration of the call with that provider
 */
function addProvider(name, duration) {
    // Transform the name into a key
    const key = name.toLowerCase().replace(/\s+/g, "");
    // Check if the provider is already there
    if (providers[key]) {
        // Provider is there, increase the coincidences
        providers[key].times++;
        // Increase the duration
        providers[key].duration += duration;
    } else {
        // Not registered, create the objects skeleton
        providers[key] = {
            name: name,
            times: 1,
            duration: duration,
        };
    }
}

/**
 * Saves the Providers in local storage
 */
function saveProviders() {
    // Save list on local storage
    chrome.storage.local.set({ providers: providers }).then(() => {
        // Update milestones
        // console.log(providers);
    });
}
