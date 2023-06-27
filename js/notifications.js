/**
 * File: notifications.js
 * Description: This file contains functions for showing toasts, modals and notifications
 * Author: Luis Mario Estrada Pereyra
 * Date: 14-02-2023
 */

// Imports
import * as storage from "./storage.js";

/**
 * Shows a toast with the specified type and message
 *
 * @param {string} msg - The message to display
 * @param {string} type - The type of toast. Defaults to "info"
 *
 */
export function showToast(msg, type = "info") {
    // Load Achievements Toast Container
    const toastContainer = document.getElementById("toastcontainer");

    if (toastContainer) {
        let btn = "";

        // Create new toast container
        let newToast = document.createElement("div");
        // Configure the toasts id
        newToast.id = "toast-tmp";
        // Configure the toasts class
        newToast.classList.add("toast");
        // Configure the toasts role and HTML variables
        newToast.role = "alert";
        newToast.ariaLive = "assertive";
        newToast.ariaAtomic = "true";

        // Handlers for Debug and BugReport toasts
        if (type == "debug") {
            type = "info";
        } else if (type == "bugreport") {
            btn = `
                <div class="mt-2 pt-2 border-top">
                    <button id="msp" type="button" class="btn btn-light btn-sm">Send Bug Report</button>
                </div>
            `;
            type = "error";
        }

        // Configure the toasts color, depending on the type
        let colorClass = "text-bg-" + type;
        newToast.classList.add(colorClass);

        // Create the toast content
        var ht =
            `
            <div class="toast-header">
                <!-- <img src="..." class="rounded me-2" alt="..."> -->
                <strong class="me-auto">MyHQ Paycheck</strong>
                <small>Information</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                <p>` +
            msg +
            `</p>` +
            btn +
            `
            </div>
        `;

        // Set the content as inner of the toast object
        newToast.innerHTML = ht;

        // Add the new toast to the container
        toastContainer.append(newToast);

        // Generate the toast functionality and show it!
        const toast = new bootstrap.Toast(newToast);
        toast.show();
        console.log("Showing toast: " + msg);
    } else {
        // There's no container, create one
        createToastContainer();

        // Call it again
        showToast(msg);
    }
}

/**
 * Shows a toast with achievement related information
 *
 * @param {string} code - The code of the achievement to display
 *
 */
export function showAchievementToast(code) {
    // Load Achievements Toast Container
    const toastContainer = document.getElementById("toastcontainer");

    if (toastContainer) {
        // Create new toast container
        let newToast = document.createElement("div");
        // Configure the toasts id
        newToast.id = "toast-tmp";
        // Configure the toasts classes
        newToast.classList.add("toast", "text-bg-success");
        // Configure the toasts role and HTML variables
        newToast.role = "alert";
        newToast.ariaLive = "assertive";
        newToast.ariaAtomic = "true";

        // Get the achievements info
        storage.loadJSON("/js/achievements.json").then(jsonAch => {
            // Save achievement information
            let achievementInfo = jsonAch[code];

            // Create the toast content
            var ht =
                `
                <div class="toast-header">
                    <img src="/images/ach/achievement.png" class="rounded me-2" height="20" alt="achievement">
                    <strong class="me-auto">Achievement unlocked!</strong>
                    <small>right now</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    <h6>` +
                achievementInfo.title +
                `</h6>
                    <p>` +
                achievementInfo.description +
                `</p>
                </div>
            `;

            // Set the content as inner of the toast object
            newToast.innerHTML = ht;

            // Add the new toast to the container
            toastContainer.append(newToast);

            // Generate the toast functionality and show it!
            const toast = new bootstrap.Toast(newToast);
            toast.show();
            console.log("Showing achievement toast");
        });
    } else {
        // There's no container, create one
        createToastContainer();

        // Call it again
        showAchievementToast(code);
    }
}

/**
 * Creates the toast container
 *
 */
function createToastContainer() {
    // Create the container
    let tstContainer = document.createElement("div");
    tstContainer.id = "toastcontainer";
    tstContainer.classList.add("toast-container", "position-fixed", "bottom-0", "end-0", "p-3");

    // Append to body
    document.querySelector("body").append(tstContainer);
}
