//Author: Brennan Ho
//Date: 12/11/2018
//Popup.js is used as the 'main' interface for searching captions and selecting times to go seek to in the video

//Helper Functions
//Converts seconds to 'HH:MM:SS'
function sec_to_hms(secs){
	 var hours = parseInt(Math.floor(secs/3600));
	 secs %= 3600;
	 var mins = parseInt(Math.floor(secs/60));
	 secs = parseInt(secs % 60);
	 if (hours < 10)
	 	hours = "0" + hours;
	 if (mins < 10)
	 	mins = "0" + mins;
	 if (secs < 10)
	 	secs = "0" + secs;

	 if (hours == "00")
	 	return mins + ":" + secs;

	 return hours + ":" + mins + ":" + secs;
}

//Add timestamp buttons (search results) to popup
function add_timestamps(div, tab_id, timestamps, phrases) {
	for (let i = 0; i < timestamps.length; i++) {
		let button = document.createElement("button");
		button.setAttribute("id", "timestamp");
		button.classList.add('animate-bottom');
		let timestamp = sec_to_hms(parseInt(timestamps[i]));
		let timestamp_secs = timestamps[i];
		button.innerHTML = timestamp.bold() + ": " + phrases[i] + " (".italics() + (i+1).toString().italics() + "/" + timestamps.length.toString().italics() + ")".italics();

		//User has selected a timestamp button
		button.addEventListener('click', function(){
			chrome.tabs.sendMessage(tab_id, {vid_time: timestamp_secs}, function(response_click){
				console.log("Sending timestamp_secs to content script:", timestamp_secs);
			});
		});
		div.appendChild(button);
	}
}
//End of Helper Functions

//Browser Events (Chrome API)
//Message passing occurs between content.js and popup.js here
//Ensure extension is disabled on all tabs by default
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	for (var tab in tabs) {
		chrome.browserAction.setIcon({path: "images/disabled-video-player.png", tabId: tab.id});
    	chrome.browserAction.disable(tab.id);
    }
    //Get cached timestamps and phrases from previous search
    try {
	    chrome.storage.sync.get(['time_keys', 'phrases'], function(result) {
	    	var div = document.getElementById("timestamps");
	    	add_timestamps(div, tabs[0].id, result.time_keys, result.phrases);
	    });
	}
	catch (err) {
		console.log(err);
	}
});

//Disable tab if not youtube video and captions are not enabled
chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
	chrome.tabs.sendMessage(tab_id, {url: change_info.url});
	if (change_info.url == undefined)
		return true;
	chrome.storage.sync.clear(function() {
        console.log('clearing storage of popup timestamps on url change');
    });
   chrome.browserAction.setIcon({path: "images/disabled-video-player.png", tabId: tab_id});
   chrome.browserAction.disable(tab_id);
});

//Clear storage for popup contents when tab focus changes
chrome.tabs.onActivated.addListener(function(active_info) {
	chrome.storage.sync.clear(function() {
        console.log('clearing storage of popup timestamps');
    });
});

//Gets captions_url from network_log then sends over to content script for downloading + processing
chrome.webRequest.onCompleted.addListener(function(details) {
	if (details.url == undefined || details.initiator != "https://www.youtube.com")
		return;
	var captions_url = details.url.replace("fmt=srv3", "fmt=srv1");
	
	//Send the captions URL to the content script for parsing
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    	chrome.tabs.sendMessage(tabs[0].id, {captions: captions_url}, function(response){
    		if (response != undefined && response.status == "Captions received") {
	    		chrome.browserAction.enable(tabs[0].id);
	    		chrome.browserAction.setIcon({path: "images/video-player.png", tabId: tabs[0].id});
	    	}
	    });
	});

}, {urls: ["https://www.youtube.com/api/timedtext?*"]});

//User search and input
function user_input(input) {
	if (input.value.length == 0)
		return;

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	    chrome.tabs.sendMessage(tabs[0].id, {user_search: input.value}, function(response){
	    	var timestamps = response.timestamps;
	    	var phrases = response.phrases;
	    	var div = document.getElementById("timestamps");

	    	//Remove timestamp buttons (search results) from popup
	    	while (div.childElementCount > 2) {
				div.removeChild(div.lastChild);
			}

			//Display message for no search results found
			if (timestamps.length == 0) {
				let failed_message = document.createElement("h4");
				failed_message.innerHTML = "No search results found";
				div.appendChild(failed_message);
			}
			else {
			//Add current search results to display
		    	add_timestamps(div, tabs[0].id, timestamps, phrases);
		    	chrome.storage.sync.set({time_keys: timestamps, phrases: phrases}, function() {
          			console.log('Storing current popup.html contents');
        		});
		   }

	    });
	});
}

function refreshButtons() {
	let timestamps = document.getElementById("timestamps");
	while (timestamps.childElementCount > 2) {
		timestamps.removeChild(timestamps.lastChild);
	}
	let loader = document.createElement("div");
	loader.setAttribute("id", "loader");
	timestamps.appendChild(loader);
	setTimeout(user_input, Math.floor(Math.random() * 500) + +250, document.getElementById('phrase-box'));
}
//End of Browser Events (Chrome API)

//Main App Buttons
//Search button click
document.getElementById('search-button').addEventListener('click', function() { 
	refreshButtons();
});
//Enter key pressed
document.getElementById('phrase-box').addEventListener('keyup', function(event) {
	event.preventDefault();
	if (event.keyCode === 13)
		refreshButtons();
});
