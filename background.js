/**
 * File: background.js
 * Description: Background script, Used to manage all the information stored locally,
 * and serving as a bridge between the dashboard pages and the content scripts
 * 
 * Author: Luis Mario Estrada Pereyra
 * Date: 24-02-2023
 */
// 

// Imports
import * as achievementsModule from './js/achievement.js';
import * as storage from './js/storage.js';

/**
 * Constants
 */
const sysDev = true;

/**
 * Moment variables
 * NOTE: These variables get destroyed every now and then, don't use them persistently
 */

/**
 * Set correct acces level so no runtime errors will be displayed
 */
chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

/**
 * Check whether new version is installed
 */
chrome.runtime.onInstalled.addListener((details) => {
  if(details.reason == "install"){
      console.log("This is a first install!");
      chrome.tabs.create({
        url: '/options.html#settings'
      });
  }else if(details.reason == "update"){
      var thisVersion = chrome.runtime.getManifest().version;
      if(thisVersion != details.previousVersion) {
        // Show info
        console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
        // Set variable for achievement
        chrome.tabs.create({
          url: '/options.html#about?update=true'
        });
      }
  }
});

/**
 * Load settings
 */
chrome.storage.local.get('settings', (result) => {
  console.log("Loading settings from storage..."); //DEBUG
  // Check if settings are present
  if(result.settings){
    // Settings present

    // Check for 100 days achievement (Specialist)
    checkSpecialistAchievement(result.settings);
    // Check for 365 days achievement (HQ Veteran)
    checkVeteranAchievement(result.settings);
  }
  else {
    // Settings not present
    console.log("No settings found. First installation or corrupt data");
    chrome.tabs.create({
      url: '/options.html#settings'
    });
  }
});

/**
 * Message Retriever and Saver
 */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if(request.instruction != undefined) {
      console.log("Received the instruction "+ request.instruction);
      switch(request.instruction) {
        case "milestone":
          // Check if the data received is complete
          if(request.code && request.text && request.date) {
            // 
          }
          break;
        
        default:
          sendResponse({error: "Instruction -" + request.instruction + "- not recognized"});
          break;
      }
    }
    else sendResponse({error: "No instruction received"});
  }
);

/**
 * Go to specific page when clicking on notifications
 * 
 * @param {string} notificationId 
 */
function processNotif(notificationId) {
  chrome.tabs.query({url: "chrome-extension://bjacoddhnoeikloaomenlfaenhdpfgpb/*"}, tabs => {
    console.log("Extension detected!" + notificationId);
    //let url = tabs[0].url; use this to get the url
  });

  switch(notificationId) {
    case "achievement": case "milestone":
      chrome.tabs.create({
        url: '/options.html#milestones'
      });
      break;
    default:
      break;
  }
};


/**
 * Listener function for local storage changes
 */
chrome.storage.onChanged.addListener((changes, area) => {
  let key = Object.keys(changes)[0];
  let data = changes[key];
  console.log("Storage change detected on key", key);
  
  switch(key) {
    // Achievements
    case "achievements":
      console.log(data);
      // Find out the achievement which was updated
      if((data.oldValue) && (data.newValue)) {
        // Allocate new and old data temporarily
        let newD = data.newValue;
        let oldD = data.oldValue;

        // See if the achievement is new
        if(Object.keys(newD).length > Object.keys(oldD).length) {
          // Achievement is new
          for (let key in newD) {
            if(!oldD[key]) {
              // This is the achievement! Check if it's unlocked
              if(newD[key].unlockDate != "") displayAchievementNotification(key); // It's unlocked now, show Notification
            }
          }
        }
        else {
          // Achievement was there, check the change
          for (let key in newD) {
            if(JSON.stringify(newD[key]) != JSON.stringify(oldD[key])) {
              // Found it, check the unlocked state
              if(newD[key].unlockDate != "") displayAchievementNotification(key); // It's unlocked now!, show Notification
            }
          }
        }
      }
      break;
    default:
      break;
  }
});

/**
 * Function that displays an achievement browser notification
 * 
 * @param {code} name - The code of the achievement
 */
function displayAchievementNotification(code) {
  // Check if code exists on database
  storage.loadJSON("/js/achievements.json").then((value) => {
    if(!value[code]) return;
    // Create notification
    chrome.notifications.create('achievement', {
      type: 'basic',
      iconUrl: 'images/ach/' + code + '.png',
      title: 'MyHQ Paycheck - Achievement Unlocked',
      message: value[code].title,
      priority: 1
    });
    chrome.notifications.onClicked.addListener((nid) => {
      processNotif(nid);
    });
  });
}

/**
 * Function to check if the user quelifies for the specialist achievement
 * 
 * @param {object} settings - The settings retrieved
 */
function checkSpecialistAchievement(settings) {
  // Get Install Date
  let installDate = settings.installdate;

  // Get today
  let today = new Date();

  // Get Parts of the saved date
  let parts = installDate.split("/");
  // Get formatted date, using all the parts
  let install = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  // Generate the difference of install date and now, in milliseconds
  let difference = today.getTime() - install.getTime();
  // Transform the milliseconds in days
  let totalDays = Math.ceil(difference / (1000 * 3600 * 24));
  

    chrome.storage.local.get('achievements', result => {
        // Get the achievements
        let ach = result.achievements;

        // Check days difference
        if(totalDays >= 100) {
            // 100 days have passed
            
            // Check if the achievement has already been unlocked
            if(ach["100"].unlockDate == "") {
                // Achievement not unlocked yet, unlock it
                chrome.tabs.create({
                url: '/options.html#milestones?100days=true'
                });
            }
        }
        else {
            // Not 100 days have passed, set current difference as achievement
            if(ach["100"].progress != totalDays) {
                ach["100"].progress = totalDays;
                // Save update on local storage
                chrome.storage.local.set({ achievements: ach });
            }
        }
    });
}


/**
 * Function to check if the user qualifies for the veteran achievement
 * 
 * @param {object} settings - The settings retrieved
 */
function checkVeteranAchievement(settings) {
    // Get First Day of Work
    let jobStart = settings.jobStart;

    // If there's not any set job Start, just exit
    if(settings.jobStart == "") return;
  
    // Get today
    let today = new Date();
  
    // Get Parts of the saved date
    let parts = jobStart.split("/");
    // Get formatted date, using all the parts
    let firstDay = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    // Generate the difference of firstDay date and now, in milliseconds
    let difference = today.getTime() - firstDay.getTime();
    // Transform the milliseconds in days
    let totalDays = Math.ceil(difference / (1000 * 3600 * 24));
    
  
    chrome.storage.local.get('achievements', result => {
        // Get the achievements
        let ach = result.achievements;
    
        // Check days difference
        if(totalDays >= 365) {
            // 365 days have passed
            console.log(totalDays);
            
            // Check if the achievement has already been unlocked
            if(!ach["oneYear"] || (ach["oneYear"].unlockDate == "")) {
                // Achievement not unlocked yet, unlock it
                chrome.tabs.create({
                    url: '/options.html#milestones?365days=true'
                });
            }
        }
        else {
            // Not 365 days have passed, set current difference as achievement
            if(ach["oneYear"].progress != totalDays) {
                ach["oneYear"].progress = totalDays;
                // Save update on local storage
                chrome.storage.local.set({ achievements: ach });
            }
        }
    });
  }

/**
 * Sets or unlocks a specific milestone
 * 
 * @param {string} code - The code of the milestone, according to milestones JSON file
 * @param {string} text - The text of the milestone, depending on its content
 * @param {string} date - The date the milestone was created, format "DD_MM-YYYY HH:mm:ss"
 */
export function setMilestone(code, text, date) {
    /** Milestones JSON Container */
    let milestones;

    /** Unlocked Milestones Container */
    let unlockedMilestones = {}

    // Load User Milestones
    storage.getDataFromLocalStorage("milestones").then( function(value) {
        if(value.empty) return;
        // Get saved settings
        unlockedMilestones = value;
        
        // Get JSON file
        storage.loadJSON('/js/milestones.json').then( data => {
            // Save Milestones on variable
            milestones = data;

            // Create object
            let tmp = {
                "text": text,
                "selMsg": 1,
                "date": date,
                "seen": false
            }

            // Check if milestone exists in the list
            if(milestones[code]) {

                // Randomize the selected message
                tmp.selMsg = Math.floor(Math.random() * (milestones[code].msg.length - 1)) + 1;

                // Unlock it!
                console.log("Setting a new milestone with code " + code );

                // Add temporary skeleton to the list
                unlockedMilestones[code] = tmp;

                // Save list on local storage
                chrome.storage.local.set({ milestones: unlockedMilestones }).then(() => {
                    console.log("Milestones list updated");
                    console.log(unlockedMilestones);

                    // Create notification
                    chrome.notifications.create('milestone', {
                        type: 'basic',
                        iconUrl: 'images/ach/achievement.png',
                        title: 'MyHQ Paycheck - New Milestone!',
                        message: milestones[code].title,
                        priority: 1
                    });
                    chrome.notifications.onClicked.addListener((nid) => {
                        processNotif(nid);
                    });
                });
            }
            else {
                // Milestone not valid, exit
                console.log("Milestone -" + code + "- not present in the JSON");
            }
        });
    });

  
}



