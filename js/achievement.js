/**
 * File: achievement.js
 * Description: This file contains functions for managing achievements in MyHQPaycheck.
 * Author: Luis Mario Estrada Pereyra
 * Date: 09-02-2023
 */

/**
 * Array for Unlocked Achievements
 */
let unlockedAchievements = {}

// Imports
import * as storage from './storage.js';
import * as milestonesModule from './milestones.js';
import * as notifications from './notifications.js';

/**
 * Adds progress to an achievement
 * @async
 * @param {string} name - The code of the achievement
 * @param {number} value - The value which will be added. Negative numbers to reduce progress
 * 
 */
export function addProgress(name, value) {

    // Declare initial value
    var val = value;


    storage.getDataFromLocalStorage("achievements").then( (uAch) => {
        if(!uAch.empty) {
            unlockedAchievements = uAch;
            
            // Check if achievement exists
            if( unlockedAchievements[name] ) {
                // Achievement exists, check if its already unlocked
                if( unlockedAchievements[name].unlockDate == "" ) {
                    // Not unlocked yet. Increase it
                    val = +unlockedAchievements[name].progress + value;
                }
                else return; // Achievement already unlocked, dont do anything
            }
            
            // Send to set function
            setProgress(name, val);
        }
    });
}

/**
 * Sets the progress of an achievement
 * 
 * @param {string} name - The code of the achievement
 * @param {number} value - The value which will be set
 * @param {boolean} onlyifHigher - Flag that defines if the value is set only if it's higher than the current value
 * 
 */
export function setProgress(name, value, onlyifHigher = false) {
    // Create object
    var tmp;
    
    // Load json achievements
    let achievements = {}
    
    storage.getDataFromLocalStorage("achievements").then( (uAch) => {
        // Load achievement list
        storage.loadJSON("/js/achievements.json").then((jsonAch) => {
            // Create achievement skeleton
            tmp = {
                "progress": 0,
                "unlockDate": "",
                "seen": false
            }

            if(!uAch.empty) {
                unlockedAchievements = uAch;
            }

            // Save objects
            achievements = jsonAch;

            // Check if achievement exists
            if( unlockedAchievements[name] ) {
                // Check if its already unlocked
                if( unlockedAchievements[name].unlockDate == "") {
                    // Not unlocked yet. Get info
                    tmp = unlockedAchievements[name];
                    
                    // Check if the function needs to check if the new value is higher than current
                    if(onlyifHigher && (tmp.progress >= value)) return; // Progress is lower than current, exit
                }
                else return; // Achievement already unlocked, dont do anything
            }

            // Check if achievement exists in the list
            if(achievements[name]) {
                // Check if new value is between limits of the goal of the achievement
                if( value < 0 ) {
                    // Value is negative, set it to 0
                    tmp.progress = 0;
                }
                else if( value >= achievements[name].goal ) {
                    // Value exceeds or is equal to the achievement goal (good boy!)
                    // Unlock it!
                    console.log("Unlocking achievement with code " + name );
                    tmp.progress = achievements[name].goal;
                    tmp.unlockDate = moment().format("DD-MM-YYYY HH:mm");
                    notifications.showAchievementToast(name);
                }
                else {
                    // Value is set, but it's not unlocked yet
                    tmp.progress = value;
                }

                // Add temporary skeleton to the list
                unlockedAchievements[name] = tmp;

                // Save list on local storage
                chrome.storage.local.set({ achievements: unlockedAchievements }).then(() => {
                    console.log("Achievement list updated");
                    console.log(unlockedAchievements);
                    // Load Achievements panel again!
                    document.getElementById("milestones-tab").click();
                });
            }
            else {
                // Achievement not valid, exit
                console.log("Achievement -" + name + "- not present in the JSON");
            }
        });
    });
}

