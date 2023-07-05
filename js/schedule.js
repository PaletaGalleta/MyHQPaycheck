/**
 * File: schedule.js
 * Description: This file contains functions that will inject on the Impact360 page
 * Author: Luis Mario Estrada Pereyra
 * Date: 12-02-2023
 */

// notifications script variable
let notifications;

// Load script
(async () => {
    const src = chrome.runtime.getURL("js/notifications.js");
    notifications = await import(src);
})();

// Set Timeout for the Injector to start working, because the page is so old that it doesn't load everything before displaying it to the user...
window.onload = setTimeout(Injector, 3000);

// Variable for Instructions
let currentInstruction = "";

// Variable for Codes
let impactCodes;

/**
 * Injector Main function
 *
 */
async function Injector() {
    if (!notifications) {
        const src = chrome.runtime.getURL("js/notifications.js");
        notifications = await import(src);
    }
    notifications.showToast("Loaded for Impact360");

    // Get workspace container
    // const content = document.querySelector("#workspaceContainer");
    const content = document.querySelector("#viewport-innerCt");

    // Create new container for the dropdown
    const dropDown = document.createElement("div");

    // Add class and ID
    dropDown.classList.add("sidebarModule", "position-absolute", "dropdown");
    dropDown.id = "sd-panel";
    dropDown.style.zIndex = 200000;
    dropDown.style.right = "10px";
    dropDown.style.top = "43px";

    // Add the custom HTML
    dropDown.innerHTML = `
        <button type="button" class="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
            <img src="/images/brand.svg" alt="Logo" height="30" class="align-text-top" id="extension-logo">
        </button>
        <ul class="dropdown-menu">
        <li><button type="button" class="dropdown-item" id="schedpersonbutton">1: Show Personal Schedule Page</button></li>
        <li><button type="button" class="dropdown-item" id="getinfo" disabled>2: Get Records</button></li>
        <li><hr class="dropdown-divider"></li>
        <li><button type="button" class="dropdown-item" id="autopilot">Autopilot <span class="badge text-bg-warning text-dark">PRO</span></button></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#extensionModal">How to capture</button></li>
        </ul>
    `;

    // Add the image source
    dropDown.querySelector("#extension-logo").src = chrome.runtime.getURL("images/brand.svg");

    // Create new container for the modal
    const extModal = document.createElement("div");

    // Add class and ID
    extModal.classList.add("modal", "fade");
    extModal.id = "extensionModal";
    extModal.tabIndex = -1;
    extModal.ariaHidden = true;
    extModal.style.zIndex = 200001;

    // Add the custom HTML
    extModal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="exampleModalLabel">How to use Impact360 capture</h1>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-8">
                            <h6 class="card-title">Step 1</h6>
                            <p class="card-text">To get the schedule information, you can either go to <strong>My Schedule → Personal</strong> or click the button on the dropdown</p>
                            <br>
                            <h6 class="card-title">Step 2</h6>
                            <p class="card-text">To save the information that is <strong>currently displayed</strong>, click on "Get Records"</p>
                            <p class="card-text">You need to display the information from the days you want before getting the records. Otherwise, they may be incomplete</p>
                            <p class="card-text"><strong>Note:</strong> If the "Get Records" option is disabled, the extension is not recognizing the current page as <strong>My Schedule → Personal</strong>. Please run the Step 1 again</p>
                        </div>
                        <div class="col-4">
                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Autopilot!</h6>
                                    <p class="card-text">You can also use the autopilot to get all missing schedules at once</p>
                                    <p class="card-text">The extension checks for any missing days and tries to get them from this page</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;

    // Check if the container is already loaded
    if (content == undefined) {
        // Container not loaded. Let the user know
        notifications.showToast("MyHQ Paycheck: The extension has not loaded on time, please reload the page.");
        // Exit the function
        return;
    }

    // Container loaded, insert it before the iframe
    content.insertBefore(dropDown, content.children[0]);

    document.body.append(extModal);

    // Add the button listeners
    document.getElementById("schedpersonbutton").addEventListener("click", send2Sched);
    document.getElementById("getinfo").addEventListener("click", getInfo);

    // Check the page for enabling/disabling the buttons
    checkPage();

    // Get the iframe and set the listener everytime it loads info
    document.getElementById("mctnt").addEventListener("load", FrameLoaded);

    // Get the impact codes and load them in a file
    fetch(chrome.runtime.getURL("/js/impactcodes.json")).then(response => {
        response.json().then(data => {
            impactCodes = data;
        });
    });
}

/**
 * Function that redirects to the correct page for the records to be displayed
 *
 */
function send2Sched() {
    // Try to get the button "Personal" inside the menu "My Schedule"
    let button = document.getElementById("1_MY_HOME->1_FS_MYSCHEDULE->2_FS_MYSCHEDULE_PERSONAL");

    // Check if the button collection was succesful
    if (button) {
        // Button exists, cancel additional instructions and click it
        currentInstruction = "";
        button.click();
    } else {
        // Button doesn't exist, add the instruction for clicking it and click the "My Schedule" button instead
        currentInstruction = "schedule";
        document.getElementById("1_MY_HOME->1_FS_MYSCHEDULE").click();
    }
}

/**
 * Function that executes something when the iframe loads or reloads information
 *
 */
function FrameLoaded() {
    // Update the buttons
    checkPage();

    // Exit if there's no instruction
    if (currentInstruction == "") return;

    // Check the curent instruction
    switch (currentInstruction) {
        case "schedule":
            // The script has clicked "My Schedule", so now it needs to click the "Personal" button
            send2Sched();
            // Clear the instruction so the script doesn't enter an endless loop
            currentInstruction = "";
            break;
        case "getInfo":
            // The script has clicked "Textual" view, so now it needs to get the desired information
            getInfo();
            // Clear the instruction so the script doesn't enter an endless loop
            currentInstruction = "";
            break;
        default:
            // Instruction is unknown
            break;
    }
}

/**
 * Function that checks the current page and enables the correct buttons for the extension to work correctly
 *
 * @returns {boolean} - The result of the validation
 *
 */
function checkPage() {
    // Check if the current page matches the "My Schedule -> Personal" page
    let chk = window.location.href.match(
        "https://impact360.languageline.com/wfo/ui/#wsm%5Bws%5D=legacyWorkspace&url=..%2Fcontrol%2Fmyschedule%3FNEWUINAV%3D1&selTab=1_MY_HOME-%3E1_FS_MYSCHEDULE-%3E2_FS_MYSCHEDULE_PERSONAL"
    );

    // Set enabled state of the buttons accordingly
    document.getElementById("schedpersonbutton").disabled = chk;
    document.getElementById("getinfo").disabled = !chk;

    // Return the result of the validation
    return chk;
}

/**
 * Function that get the information displayed on the "My Schedule -> Personal" page
 *
 */
function getInfo() {
    // Generate today's date
    const now = moment();

    // Verify if we are in the correct page
    if (!checkPage) {
        // Incorrect page, send to the correct page instead
        currentInstruction = "getInfo";
        send2Sched();
        // Exit
        return;
    }

    // Get the frame
    const frame = document.getElementById("mctnt");

    // If frame not present, exit
    if (!frame) return;

    // Get "View" Dropdown
    const dropdownView = frame.contentWindow.document.querySelector(".bpDropDownText");

    // If Dropdown not present, exit
    if (!dropdownView) return;

    // Check if we are in Textual or Graphical View
    if (dropdownView.value == "Textual") {
        // The user has the correct view, continue

        // Get frame content
        const content = frame.contentWindow.document.getElementById("workpaneListWrapper");

        // If content not present, exit
        if (!content) return;

        // Get children tables
        const children = content.children;

        let tables = [];

        // Get Tables
        for (let f = 0; f < children.length; f++) if (children[f].tagName === "TBODY") tables.push(children[f]);

        // If no tables, exit
        if (tables.length == 0) return;

        // Create counter
        let regsSaved = 0;

        // Tables iterator
        for (let it = 0; it < tables.length; it++) {
            const table = tables[it];

            // Loop through rows
            for (i = 0; i < table.rows.length; i++) {
                // Get Row
                const row = table.rows.item(i);

                // Initialize array for each day
                let regDay = {
                    type: "",
                    mins: {
                        immediate: 0,
                        break: 0,
                        lunch: 0,
                        ap: 0,
                        overtime: 0,
                        training: 0,
                    },
                    shift: {
                        start: "",
                        end: "",
                        realStart: "",
                        realEnd: "",
                    },
                };

                // Get cells of the row
                const oCells = row.cells;

                // Get info from cell 1 (Date and Shift info)
                const shiftInfo = oCells.item(1);

                // Get info from cell 2 (Activities)
                const activities = oCells.item(2);

                // Get date of the record
                let date = shiftInfo.querySelector(".shift-date").innerHTML;

                // Convert the date
                date = moment(date, "dddd LL");

                // Verify if the date is in the past range
                if (date < now) {
                    // Get the shift textual information
                    let shiftInfoTxt = shiftInfo.querySelector(".shift-label");
                    if (shiftInfoTxt) shiftInfoTxt = shiftInfoTxt.innerHTML;
                    else shiftInfoTxt = shiftInfo.querySelectorAll("span")[1].innerHTML;

                    // Check if it's a day off
                    if (shiftInfoTxt == "Off") {
                        saveDay(moment(date).format("DD-MM-YYYY"), { type: "Off" });
                        regsSaved++;
                        // Don't do anything anymore and continue to the next day
                        continue;
                    }

                    // Enlist activities
                    let activitiesGroup = activities.querySelectorAll(".activity-event");
                    console.log(activitiesGroup.length + " activities detected");

                    // Loop for all activities
                    for (let j = 0; j < activitiesGroup.length; j++) {
                        // Get Name of the activity
                        let actName = activitiesGroup[j].querySelector(".activity-event-activity").textContent.trim();
                        // Get Period of the activity
                        let period = activitiesGroup[j].querySelector(".activity-event-period").textContent.trim();

                        // Create the regex for splitting the period into two hours
                        let splitRegex = /(\d+:\d+ [AP]M)(?: - (\d{1,2}\/\d{1,2}\/\d{4})?\s*(\d+:\d+ [AP]M))?/;

                        // Format the hours
                        let first = moment(period.match(splitRegex)[1], "hh:mm A");
                        let second = moment(period.match(splitRegex)[3], "hh:mm A");

                        // If it's the first pass, save the first hour as the start hour of the shift
                        if (j == 0) regDay.shift.start = moment(first).format("kk:mm:ss");
                        // If it's the last pass, save the last hour as the last hour of the shift
                        if (j == activitiesGroup.length - 1) regDay.shift.end = moment(second).format("kk:mm:ss");

                        // Save it as a normal day
                        regDay.type = "Normal";

                        // Check if end is before start (Graveyard shifts), otherwise swap them
                        if (second.diff(first, "minutes") < 0) {
                            let tt = second;
                            second = first;
                            first = tt;
                            tt = null;
                        }

                        // Save the minutes depending on the activity
                        if (impactCodes[actName]) {
                            // Code Exists in JSON
                            const codeDesc = impactCodes[actName];

                            switch (codeDesc.type) {
                                // Immediates
                                case "Activity":
                                case "Paid Absence":
                                case "Paid Leave":
                                    // Save the start of the immediate shift if not saved yet
                                    if (regDay.shift.realStart == "") regDay.shift.realStart = moment(first).format("kk:mm:ss");
                                    // Save the end of the activity as the real end
                                    regDay.shift.realEnd = moment(second).format("kk:mm:ss");

                                    regDay.mins.immediate += second.diff(first, "minutes");
                                    break;

                                // Absences
                                case "Absence":
                                case "Leave":
                                    regDay.mins.ap += second.diff(first, "minutes");
                                    break;

                                // Holidays
                                case "Holiday":
                                    regDay.type = actName;
                                    break;

                                // Overtime
                                case "Overtime":
                                    regDay.mins.overtime += second.diff(first, "minutes");
                                    break;

                                // Break
                                case "Break":
                                    regDay.mins.break += second.diff(first, "minutes");
                                    break;

                                // Lunch
                                case "Lunch":
                                    regDay.mins.lunch += second.diff(first, "minutes");
                                    break;

                                // Training
                                case "Training":
                                    // Save the start of the Training shift if not saved yet
                                    if (regDay.shift.realStart == "") regDay.shift.realStart = moment(first).format("kk:mm:ss");
                                    // Save the end of the activity as the real end
                                    regDay.shift.realEnd = moment(second).format("kk:mm:ss");
                                    regDay.mins.training += second.diff(first, "minutes");
                                    break;

                                // Gaps
                                case "Gap":
                                    break;
                            }
                        } else {
                            // Code doesn't exist
                            const tDate = moment(date).format("DD-MM-YYYY");
                            const toastMsg = `There is an activity on ${tDate} which was not recognized: ${actName}`;
                            notifications.showToast(toastMsg, "bugreport");
                        }
                    } // end-for

                    // Increment the days saved
                    regsSaved++;
                } else {
                    // Date is today or future, exit
                    break;
                }

                saveDay(moment(date).format("DD-MM-YYYY"), regDay);
            } // end-for
        }

        if (regsSaved == 0) notifications.showToast("No days have been saved in the system", "warning");
        else
            regsSaved == 1
                ? notifications.showToast("1 day have been saved in the system", "success")
                : notifications.showToast(regsSaved + " days have been saved in the system", "success");
    } else {
        // The user has graphical mode

        // Show notification
        notifications.showToast("You have Graphical mode enabled. Changing it back to Textual view...");

        // Change View
        setTextualView();
    }
}

/**
 * Function for setting the Textual View
 *
 */
function setTextualView() {
    // Get the frame
    const frame = document.getElementById("mctnt");

    // If frame not present, exit
    if (!frame) return;

    // Set instruction for getting info when reloaded
    currentInstruction = "getInfo";

    // Get the dropdown option
    const textualSel = frame.contentWindow.document.querySelector(".bpDropDownText");
    const textualDrop = frame.contentWindow.document.querySelector(".bpDropDownList");

    // If dropdowns are not present, exit
    if (!textualSel || !textualDrop) return;

    // Change the dropdown values
    textualSel.value = "Textual";
    textualSel.fancytitle = "Textual";
    textualDrop.value = "myschedule";
    // Force a "change" event
    textualDrop.dispatchEvent(new Event("change"));
}

/**
 * Function for saving and Processing the info
 *
 * @param {string} date - The date for saving
 * @param {object} regDay - The object of the day's records
 *
 */
function saveDay(date, regDay) {
    // Save object on file
    var kKey = "shift-" + date;
    chrome.storage.local.set({ [kKey]: regDay });
}
