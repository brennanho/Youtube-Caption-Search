//Author: Brennan Ho
//Date: 12/11/2018
//Content.js is used to modify page contents on the current tab (i.e. seekTo video time)

//Helper Functions
function get_timestamp(tag) {
	return tag.attributes.item(0).nodeValue;
}

function get_caption(tag) {
	return tag.textContent.toLowerCase().replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g,' ').trim();
}

//https://stackoverflow.com/questions/18740664/search-whole-word-in-string
function is_match(search_on_string, search_text) {
  search_text = search_text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  return search_on_string.match(new RegExp("\\b"+search_text+"\\b", "i")) != null;
}

function populate_captions(response) {
	let tags = Array.prototype.slice.call(response.getElementsByTagName('text'));
	let captions = tags.map(get_caption);
	let timestamps = tags.map(get_timestamp);

	let captions_and_timestamps = {};
	for (var i = 0; i < captions.length; i++) {
		captions_and_timestamps[captions[i]] = timestamps[i];
	}
	return captions_and_timestamps;
}

function init() {
	console.log(document.getElementsByClassName('ytp-subtitles-button ytp-button')[0]);
	try {
		console.log("ClICK");
		let button = document.getElementsByClassName('ytp-subtitles-button ytp-button')[0];
		if (button.getAttribute("aria-pressed") == "false") {
			button.click();
		}
	} catch(err) {
		console.log("FAILED");
	}
}
//End of Helper Functions

var captions_and_timestamps = {};
var Http = new XMLHttpRequest();

window.onload = init;

//Used for downloading, searching captions, and seeking to a time in a video
//Message passing occurs between content.js and popup.js here
chrome.runtime.onMessage.addListener(function(response, sender, send_response) {
	if (response.url != undefined)
		setTimeout(init, 500);
	//Populates captions_and_timestamps: called only when youtube video cc is turned on
	if (response.captions != undefined) {
		Http.onreadystatechange = function() {
			if (this.readyState == 4) {
				captions_and_timestamps = populate_captions(Http.responseXML);
			}
		}
		Http.open("GET", response.captions);
		Http.send();
		send_response({status: "Captions received"});	
	}
	
	//Populates list of timestamps when user inputs a word/phrase
	else if (response.user_search != undefined) {
		var search_results = [];
		var phrase_results = [];
		for (var caption in captions_and_timestamps) {
			if (is_match(caption, response.user_search)) {
				search_results.push(captions_and_timestamps[caption]);
				let caption_split = caption.split(response.user_search);
				let colored_search = '<font color="red">' + response.user_search + ' </font>'
				let colored_caption = caption_split[0] + colored_search + caption_split[1];
				phrase_results.push(colored_caption);
			}
		}
		send_response({timestamps: search_results, phrases: phrase_results});
	}

	//Goes to vid_time in youtube video when user clicks on the button
	else if (response.vid_time != undefined) {
		var player = document.getElementsByTagName("video")[0];
		player.currentTime = parseFloat(response.vid_time);
		console.log(response.vid_time);
	}

});