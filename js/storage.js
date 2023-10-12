/**
 * File: storage.js
 * Description: This file contains functions for getting and setting data from storage.
 * Author: Luis Mario Estrada Pereyra (@PaletaGalleta)
 * Date: 09-02-2023
 */

// Constants
const BACKUP_VERSION = "1";

/**
 * Verifies if a certain file exists in the specified path
 *
 * @param {string} url - The path and filename to look for
 *
 * @return {boolean} - The result of the fetch
 *
 */
export function fileExists(url) {
    const http = new XMLHttpRequest();

    http.open("HEAD", url, false);
    try {
        http.send();
        return http.status != 404;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the data from local storage.
 * Needs to be called from an async function, using -then-
 *
 * @param {string} key - The key to look for
 *
 * @return {Promise} - The Promise until the function gets the info
 *
 */
export function getDataFromLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], result => {
            const objectResult = result[key];
            resolve(objectResult ? objectResult : {empty: true});
        });
    });
}

/**
 * Gets JSON data from a file.
 *
 * @async
 *
 * @param {string} filename - The filename of the achievement, in full path
 *
 * @return {JSON} The Object loaded from the JSON file
 *
 */
export function loadJSON(filename) {
    return new Promise((resolve, reject) => {
        fetch(filename).then(response => {
            response.json().then(data => {
                resolve(data);
            });
        });
    });
}

/**
 * Export Data
 */
export function exportData() {
    return new Promise((resolve, reject) => {
        // Verify if an option is selected
        const exportSettings = document.getElementById("export-settings").checked;
        const exportCalls = document.getElementById("export-calls").checked;
        const exportShifts = document.getElementById("export-shifts").checked;
        const exportPaycheck = document.getElementById("export-paycheck").checked;

        if (!exportSettings && !exportCalls && !exportShifts && !exportPaycheck) return;

        // Create bundle object
        const objectData = {};

        // Get all keys
        chrome.storage.local.get(null).then(data => {
            const keys = Object.keys(data);

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];

                // Get settings & Achievements
                if ((key === "settings" || key === "achievements") && !exportSettings) continue;
                // Get recs
                if ((key.startsWith("rec-") || key === "providers") && !exportCalls) continue;
                // get schedules
                if (key.startsWith("shift-") && !exportShifts) continue;
                // Get periods
                if (key.startsWith("per-") && !exportPaycheck) continue;

                objectData[key] = data[key];
            }

            // Save backup information
            objectData.backup = {
                date: moment().format("DD-MM-YYYY"),
                version: BACKUP_VERSION,
            };

            // Save to file
            exportJSONToFile(objectData, "MyHQPaycheck-backup-" + moment().format("DD-MM-YY-HHmm"));

            // Uncheck everything
            const exportAll = document.getElementById("export-all");
            exportAll.checked = true;
            exportAll.checked = false;
            exportAll.dispatchEvent(new Event("change"));

            resolve(true);
        });
    });
}

/**
 * Exports the JSON object to a specific filename
 *
 * @param {JSON} jsonData - The JSON object to export
 * @param {string} filename - The name of the file to be created
 */
function exportJSONToFile(jsonData, filename) {
    const jsonString = JSON.stringify(jsonData);
    const blob = new Blob([jsonString], {type: "application/json"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Import Data
 */
export async function importData(savedEmail, override = false) {
    return new Promise((resolve, reject) => {
        // Import input
        const importInput = document.getElementById("import-file");

        // Verify that the file is ready
        if (importInput.files[0].name == "") return;

        // Read content of the file
        const selectedFile = importInput.files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            const fileContent = event.target.result;

            try {
                // Parse to JSON
                const backupData = JSON.parse(fileContent);

                chrome.storage.local.get(null).then(data => {
                    const keys = Object.keys(data);

                    // Check if the backup has the same email
                    if (savedEmail !== backupData.settings.email) {
                        // Show modal and exit
                        const warningModal = new bootstrap.Modal("#import-error", {
                            keyboard: false,
                            focus: true,
                            backdrop: "static",
                        });

                        document.getElementById("import-error-text").innerHTML =
                            "No se puede realizar la importación: El correo electrónico no coincide con el actual.";
                        warningModal.show();
                        return;
                    }

                    // Check if the extension has data already
                    if (keys.length > 3 && !override) {
                        // Show modal and exit
                        const warningModal = new bootstrap.Modal("#importWarning", {
                            keyboard: false,
                            focus: true,
                            backdrop: "static",
                        });

                        warningModal.show();
                        return;
                    }

                    // Save all new data to local storage
                    chrome.storage.local.set(backupData).then(() => {
                        // Notify of completion
                        resolve(true);
                    });
                });
            } catch (e) {
                reject(e);
            }
        };

        reader.readAsText(selectedFile);
    });
}
