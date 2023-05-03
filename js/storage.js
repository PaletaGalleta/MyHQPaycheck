/**
 * File: storage.js
 * Description: This file contains functions for getting and setting data from storage.
 * Author: Luis Mario Estrada Pereyra
 * Date: 09-02-2023
 */


/**
 * Function which verifies if a certain file exists in the specified path
 * 
 * @param {string} url - The path and filename to look for
 * 
 * @return {boolean} - The result of the fetch
 * 
 */
export function fileExists(url){
    var http = new XMLHttpRequest();
    
    http.open('HEAD', url, false);
    try {
        http.send();
        return http.status != 404;
    }
    catch(error) {
        return false;
    }
}

/**
 * Function which gets the data from local storage.
 * Needs to be called from an async function, using -then-
 * 
 * @param {string} key - The key to look for
 * 
 * @return {Promise} - The Promise until the function gets the info
 * 
 */
export function getDataFromLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
            const objectResult = result[key];
            resolve((objectResult) ? objectResult : {"empty": true});
        });
    });
}

/**
 * Function which gets JSON data from a file.
 * Needs to be called from an async function, using -then-
 * 
 * @async
 * 
 * @param {string} filename - The filename of the achievement, in full path
 * 
 * @return {JSON} - The Object loaded from the JSON file
 * 
 */
export async function loadJSON(filename) {
    const response = await fetch(filename);
    const data = await response.json();
    return data;
}