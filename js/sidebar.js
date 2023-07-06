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
 * Main initializer for the sidebar
 */
async function initialize() {
    // Get notifications library
    notifications = await import(chrome.runtime.getURL("js/notifications.js"));
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
            <input type="button" id="sd-getinfo" value="Save Call Records">
        </div>
    `;
    sidebar.append(sidebarPanel);

    // Add click listener for getting call reg
    document.getElementById("sd-getinfo").addEventListener("click", getInfo);

    // Get providers info
    const result = await chrome.storage.local.get(["providers"]);
    console.log(result);
    providers = result ? result : {};

    // Enable button
    document.getElementById("sd-getinfo").disabled = false;
}
initialize();

/**
 * Function to get info from rows
 *
 */
async function getInfo() {
    // Disable the button
    document.getElementById("sd-getinfo").disabled = true;

    /** Current date (cache) */
    let currentDate = "0";

    /** Array for the info of each call */
    let callInfo = [];

    /** Scrape Table */
    const CallTB = document.querySelector("table .list");

    if (!CallTB) {
        notifications.showToast("No calls to save", "warning");
        return;
    }

    /** The rows of the table */
    const rowLength = CallTB.rows.length;
    console.log(rowLength + " call records found");

    savedCalls = 0;

    // Loop through calls
    for (i = rowLength - 1; i > 0; i--) {
        /** Object for the calls of the day */
        const callDay = {
            startTime: "",
            endTime: "",
            account: "",
            language: "",
            duration: "",
            report: false,
        };

        /** Calls in the row */
        const oCells = CallTB.rows.item(i).cells;

        // Get info from cell 2 (Call Report)
        const rep = oCells.item(2).innerHTML;
        if (rep == "Yes") callDay.report = true;

        // Get info from cell 4 (Start Time)
        const strt = oCells.item(4).innerHTML.replace(/\&nbsp;/g, "");
        const startTime = moment(strt, "MM-DD-YYYY hh:mm:ss A");

        // Get info from cell 5 (End Time)
        const end = oCells.item(5).innerHTML.replace(/\&nbsp;/g, "");
        const endTime = moment(end, "MM-DD-YYYY hh:mm:ss A");

        // Get info from cell 6 (Account)
        const acct = oCells.item(6).innerHTML.replace(/,/g, "");

        // Get info from cell 7 (Language)
        const lang = oCells.item(7).innerHTML.replace(/,/g, "");

        // Get info from cell 8 (Duration)
        const dur = oCells.item(8).innerHTML.replace(/,/g, "");

        // Get date from start
        const startDate = moment(startTime).format("DD-MM-YYYY");

        // Check if date is on cache
        if (currentDate != startDate) {
            // Date not in cache, check if its first run or day change
            if (currentDate != "0") {
                // Its day change, save the previous object
                await saveCallDay(currentDate, callInfo);
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
    await saveCallDay(currentDate, callInfo);

    // Save providers
    saveProviders();

    if (savedCalls > 0) {
        const days = savedCalls == 1 ? " day" : " days";
        notifications.showToast(`${rowLength} call records found. ${savedCalls + days} updated`);
    } else notifications.showToast(rowLength + " call records found. No changes detected");

    // Get settings
    const resSettings = await chrome.storage.local.get(["settings"]);
    const stng = resSettings.settings;
    // Add call date
    stng["lastCapturedCalls"] = moment().format("DD/MMMM/YY HH:mm:ss");
    await chrome.storage.local.set({ settings: stng });

    // Enable the button
    document.getElementById("sd-getinfo").disabled = false;

    console.log(providers);
}

/**
 * Function for saving and Processing the info for each day
 *
 * @param {string} date - The date for saving
 * @param {Array} calls - The array of calls which will be saved
 *
 */
function saveCallDay(date, calls) {
    return new Promise((resolve, reject) => {
        // Check if call record already exists
        chrome.storage.local.get("rec-" + date).then(result => {
            // Get the records
            const ach = result["rec-" + date];

            // Check if theres already a record saved on file
            if (ach) {
                // Check if the amount of calls is the same
                if (ach.calls.length == calls.length) {
                    resolve(false); // Don't save anything
                    return;
                }
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
                const callRec = dayRecords.calls[i];
                // Shortcut to duration
                const dur = callRec.duration;

                // Get time between calls
                if (i > 0) {
                    let tim = moment(callRec.startTime, "HH:mm:ss").diff(
                        moment(dayRecords.calls[i - 1].endTime, "HH:mm:ss"),
                        "seconds"
                    );
                    availableTime += tim;
                }

                // Add duration to totals
                totalDuration += dur;

                // Unlock devil achievement
                if (totalDuration / 60 > 666) {
                    UnlockAchievement("devil", date, callRec.endTime, 666);
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
                            const diff = moment(callRec.startTime, "HH:mm:ss").diff(moment(shortCalls[s], "HH:mm:ss"), "minutes");
                            if (diff > shortCallsMins) {
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
                    shortCalls.push(callRec.startTime);

                    // Check if short call amount is 5
                    if (shortCalls.length >= 5) UnlockAchievement("pinLocked", date, callRec.startTime);
                    // Check if short call amount is 4
                    else if (shortCalls.length == 4) UnlockAchievement("pinAlmostLocked", date, callRec.startTime);

                    // Check if duration is 1 second
                    if (dur == 1) UnlockAchievement("onesec", date, callRec.startTime);

                    // Check if duration is 0 seconds
                    if (dur == 0) UnlockAchievement("zerosec", date, callRec.startTime);
                }

                // Check if the call was in another language
                if (callRec.language != "SPANISH") UnlockAchievement("otherlang", date, callRec.startTime);

                // Increase the counter if call reports is YES
                if (callRec.report) dayRecords.reports++;

                // Delete the language field
                delete callRec.language;

                // Get the providers info and send it to the function
                addProvider(callRec.account, dur);

                // Delete the provider field
                delete callRec.account;
            }

            // Save counters
            let avgDuration = Math.trunc(totalDuration / dayRecords.calls.length);
            dayRecords.avgDuration = moment().startOf("day").second(avgDuration).format("HH:mm:ss");
            dayRecords.totalDuration = moment().startOf("day").second(totalDuration).format("HH:mm:ss");
            dayRecords.highestDuration = moment().startOf("day").second(highestDuration).format("HH:mm:ss");
            dayRecords.lowestDuration = moment().startOf("day").second(lowestDuration).format("HH:mm:ss");
            dayRecords.availableTime = availableTime;

            // Save object on file
            const kKey = "rec-" + date;
            savedCalls++;
            chrome.storage.local.set({ [kKey]: dayRecords }).then(() => {
                notifications.showToast("Calls Saved on file succesfully - Date: " + date);
                resolve(1);
            });
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
        const extensionUrl = chrome.runtime.getURL("");
        fetch(extensionUrl + "js/achievements.json").then(val => {
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
