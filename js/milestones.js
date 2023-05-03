/**
 * File: achievement.js
 * Description: This file contains functions for managing the Milestones Page in MyHQPaycheck.
 * Author: Luis Mario Estrada Pereyra
 * Date: 09-02-2023
 */

// Imports
import * as achievementsModule from './achievement.js';
import * as storage from './storage.js';

/** Milestones JSON Container */
let milestones;

/** Unlocked Milestones Container */
let unlockedMilestones = {}

/** Achievements JSON Container */
let achievements;

/** Unlocked Achievements Container */
let unlockedAchievements = {}

//** The variable for the Bootstrap modal */
let achievementsModal;

/**
 * Function to Initialize the Milestones Tab
 * 
 */
export function load() {
    // Load User Milestones
    storage.getDataFromLocalStorage("milestones").then( function(value) {
        if(!value) return;
        // Get saved settings
        unlockedMilestones = value;
        
        // Get JSON file
        storage.loadJSON('/js/milestones.json').then( data => {
            // Save Milestones on variable
            milestones = data;
            // Load the milestones list
            loadMilestones();
        });
    });
    // Load User Achievements
    storage.getDataFromLocalStorage("achievements").then( (value) => {
        // Get saved settings
        if(!value.empty) unlockedAchievements = value;

        // Get JSON file
        storage.loadJSON('/js/achievements.json').then( data => {
            // Save Achievements on variable
            achievements = data;
            // Load the achievements list
            loadAchievements();
            // Load the modal
            achievementsModal = new bootstrap.Modal('#achievementsModal', {keyboard: false});
            // Create the modal listener
            document.getElementById('achievementsModal').addEventListener('hidden.bs.modal', event => {
                displayNewAchievements();
            });
            displayNewAchievements();
        });
    });
}

/**
 * Function to load milestones section
 * 
 */
export function loadMilestones() {
    const container = document.getElementById("milestonescontainer");
    let innerh = "";

    for (let key in milestones) {
        // Get milestone info
        let ms = milestones[key];
        // Get user milestone info
        let ums = unlockedMilestones[key];

        // Set normal parameters
        let txt = "N/A";
        let selMsg = 0;
        let date = "No records yet";

        // Check if user has that milestone
        if(ums) {
            txt = ums.text;
            selMsg = ums.selMsg
            date = moment(ums.date, "DD-MM-YYYY HH:mm:ss");
        }

        // Add card
        innerh += `
          <div class="col-lg-6 col-sm-12 mb-3 mb-sm-3">
            <div class="card">
              <div class="card-body text-start">
                <h5 class="card-title">` + ms.title + `</h5>
                <p class="card-text"><h2>` + txt + `</h2></p>
                <p class="card-text text-muted">` + ms.msg[selMsg] + `</p>
              </div>
              <div class="card-footer text-muted"> ` + date + ` </div>
            </div>
          </div>
        `;
    }
    // Add cards to container
    container.innerHTML = innerh;
}

/**
 * Function to load achievements section
 * 
 */
export function loadAchievements() {
    // Get HTML container
    const container = document.getElementById("achievementscontainer");

    // Counter for unlocked achievements
    let unlockedCounter = 0;

    container.innerHTML = "";
    console.log(unlockedAchievements);

    // Loop for every achievement found in JSON file
    for (let key in achievements) {
        // Get achievement info
        let ac = achievements[key];
        // Get user achievement info
        let uac = unlockedAchievements[key];

        // Set default parameters
        let state = false;
        let prog = 0;
        let date = "Locked";
        let unlocked;
        let barprog = 0;
        let title = ac.title;
        let desc = ac.description;
        
        let imgSrc = "achievement";

        // Set secret status
        let secretenabled = ac.secret;
        
        // Check if user has that achievement
        if(uac) {
            // Save progress
            prog = uac.progress;

            // Check if achievement is unlocked
            if(uac.unlockDate != "") {
                unlocked = "order-first" // Unlocked achievements go first
                state = true; // enable it
                date = "Unlocked " + moment(uac.unlockDate, "DD-MM-YYYY HH:mm").fromNow() + " (" + moment(uac.unlockDate, "DD-MM-YYYY HH:mm").format("DD/MMM/YYYY") + ")"; // Set unlock date
                secretenabled = false; // Disable secret if unlocked
                if(prog == 1) prog = ""; // If progress is simple (0-1), don't show the 1
                barprog = 100; // Show full progress bar
                imgSrc = key; // Display the achievement icon
                unlockedCounter++;
            }
            else {
                // Calculate progress
                barprog = 100 / ac["goal"] * prog;
            }
        }

        // Check if achievement is secret
        if(secretenabled) {
            imgSrc = "secret";
            prog = 0; // Dont show progress
            title = "Secret" // Hide title
            desc = "You need to unlock this achievement in order for you to see it" // Hide description
            unlocked = "order-last" // Secret achievements go last
        }
        
        // Create the configure the card container
        let column = document.createElement("div");
        column.classList.add("col-12", "col-md-6", "col-lg-4", "mb-sm-0", "mb-3");
        if(unlocked) column.classList.add(unlocked);

        // Create the configure the card div
        let card = document.createElement("div");
        card.classList.add("card", "mb-3");
        if(!state) card.classList.add("disabled");

        // Create the configure the card content container
        let cardct = document.createElement("div");
        cardct.classList.add("row", "g-0", "g-flex", "align-items-center");

        // Create the configure the card footer
        let cardft = document.createElement("div");
        cardft.classList.add("card-footer", "text-secondary");
        cardft.innerHTML = date;

        // Create the configure the image container
        let imgct = document.createElement("div");
        imgct.classList.add("col-4");

        // Create the configure the image
        let img = document.createElement("img");
        img.classList.add("img-fluid", "px-3");
        img.src = storage.fileExists("images/ach/" + imgSrc + ".png") ? "images/ach/" + imgSrc + ".png" : "images/ach/achievement.png";
        img.alt = "achievement_img";

        // Create the configure the text container
        let txtct = document.createElement("div");
        txtct.classList.add("card-body", "col-8");

        // Create the configure the title
        let ttl = document.createElement("h5");
        ttl.classList.add("card-title");
        ttl.innerHTML = title;

        // Create the configure the description
        let dsc = document.createElement("p");
        dsc.classList.add("card-text");
        dsc.innerHTML = desc;

        // Create the configure the description
        let dsc2 = document.createElement("p");
        dsc2.classList.add("card-text");
        dsc2.innerHTML = `<small>` + ac["description2"] + `</small>`;

        // Create the configure the progressbar container
        let progressctr = document.createElement("div");
        progressctr.classList.add("progress");
        progressctr.role = "progressbar";
        progressctr.ariaLabel = "Example with label";
        progressctr.ariaValueNow = 0;
        progressctr.ariaValueMin = 0;
        progressctr.ariaValueMax = 100;

        // Create the configure the text container
        let progre = document.createElement("div");
        progre.classList.add("progress-bar", "bg-success");
        progre.style.width = barprog + "%";
        progre.innerHTML = prog;


        // Append everything to containers
        progressctr.append(progre);

        txtct.append(ttl);
        txtct.append(dsc);
        if(barprog == 100) txtct.append(dsc2);
        txtct.append(progressctr);

        imgct.append(img);

        cardct.append(imgct);
        cardct.append(txtct);

        card.append(cardct);
        card.append(cardft);

        column.append(card);

        container.append(column);
    }

    // Set the achievements counter and overall progress
    document.getElementById('acoveralltxt').innerHTML = unlockedCounter + "/" + Object.keys(achievements).length + " Achievements unlocked";
    let overprogtxt = 100 / Object.keys(achievements).length * unlockedCounter;
    const overprog = document.getElementById('acoverall');
    overprog.innerHTML = (Math.round(overprogtxt * 100) / 100).toFixed(1) + "%";
    overprog.style.width = overprogtxt + "%";
}

export function displayNewAchievements() {
    for (const key in unlockedAchievements) {
        if((unlockedAchievements[key].unlockDate != "") && !unlockedAchievements[key].seen) {
            document.getElementById("achievementmodal-title").innerHTML = achievements[key].title;
            document.getElementById("achievementmodal-img").src = "/images/ach/" + key + ".png";
            document.getElementById("achievementmodal-desc").innerHTML = achievements[key].description;
            document.getElementById("achievementmodal-desc2").innerHTML = achievements[key].description2;

            unlockedAchievements[key].seen = true;

            achievementsModal.show();

            // Save update on local storage
            chrome.storage.local.set({ achievements: unlockedAchievements });
            
            return;
        }
    }
}



