
/*
 *	Initial setup
 */

const FIVE_MINUTES = 300000;
const TEN_MINUTES = 600000;
 
var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var request = require('request')

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.loggedIn = false;
app.cookieJar = request.jar(); // Global cookie store
app.cachedDrama = { "code": "", "stories": [] }; // Basic format for JSON response
 
var routes = require("./routes/routes.js")(app);

var deployTarget = process.env.PORT || 3000;

var server = app.listen(deployTarget, () => {

	setTimeout(() => {
		
		// TODO: refactor this so we can call these methods immediately 
		// (otherwise app will display error page for 10 mins, as return value is delayed)
		
		if (app.loggedIn) {
			console.log("Logged in - fetching drama");
			app.fetchDrama();
		}
		
		else {
			console.log("Logging in, and then fetching drama");
			app.loginToBlueSite();
		}
		
	}, TEN_MINUTES);
	
});


/**
  *	 Log into ETI using environment vars as credentials
  */

app.loginToBlueSite = function() {
	const LOGIN_URL = "https://endoftheinter.net/";
	const formData = { b: process.env.USERNAME, p: process.env.PASSWORD };
	
	request.post({
		
		headers: {"content-type": "application/x-www-form-urlencoded"},
		url: LOGIN_URL,
		form: formData,
		jar: app.cookieJar
		
	}, (error, response, body) => {
				
			// After successful login, ETI will attempt to redirect you to homepage
			if (!error && response.statusCode === 302) {
				
				if (app.cachedDrama.code !== "" && new Date().getTime() < app.cachedDrama.refreshTime) {
					callback(app.cachedDrama);
				}
				
				else {			
					app.cookieJar.setCookie("userid=" + process.env.USER_ID);
					app.loggedIn = true;
					app.fetchDrama();
				}
			}
			
			else {
				console.log("Login failed.");				
			}
	});
};


/**
  *	Fetches raw drama feed from wiki
  */

app.fetchDrama = function() {
		const DRAMA_URL = "http://wiki.endoftheinter.net/index.php?title=Dramalinks/current&action=raw&section=0&maxage=30";

		// Get raw drama feed from wiki
		request.get({
			
				url: DRAMA_URL,
				jar: app.cookieJar
				
		}, (error, response, body) => {
			
			if (!error && response.statusCode == 200) {
				app.cachedDrama.refreshTime = new Date().getTime() + TEN_MINUTES;
				app.cachedDrama = app.parseResponse(body);
			}
			
			else {
				// Something went wrong
				console.log("Empty response");							
			}
			
		});
};


/**
  *	Parse dramaticker url and convert into JSON format (as best as possible)
  */
	
app.parseResponse = function(response) {
	if (response !== "") {
		// Clean up the response a bit
		response = response.replace(/style=/gi, "");
		response = response.replace(/<script/gi, "");
		response = response.replace(/(on)([A-Za-z]*)(=)/gi, "");	
		response = response.replace(/\t\t/g, "");
		response = response.replace(/\* /g, "");
				
		var splitResponse = response.split("\n");		
		
		var drama = splitResponse.filter(line => (line.indexOf("<!--") == -1));
		drama = drama.filter(line => (line.indexOf("<div") == -1));
		drama = drama.filter(line => (line.indexOf("</div>") == -1));
		drama = drama.filter(line => (line.indexOf("{{") == -1));
				
		// To find URLs we can use simpleUrlRegex to find content wrapped in single square brackets,
		// then check that they metch the urlValidation regex to be sure. The second step is probably unnecessary
		var simpleUrlRegex =/(?:^|[^[\])\{([^[\]]*)(?=\](?!\]))/g;
		var urlValidation = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
		
		var stories = [];
		
		for (var i = 0, len = drama.length; i < len; i++) {
			var story = drama[i];
			if (story) { // Can be undefined
				var urls = story.match(simpleUrlRegex);
				
				if (urls) {
					var tempUrlsArray = [];
					
					for (var j = 0, len = urls.length; j < len; j++) {
						var url = urls[j];	
						
						if (url.match(urlValidation)) {
							story = story.replace("[" + url + "]", "").trim();
							story = story.replace("  ", " ");
							tempUrlsArray.push(url);
						}
						
						// Usernames are wrapped in double square brackets - we should remove them
						story = story.replace(/\[{2}|\]{2}/g, "");
					}
				}
				
				stories.push({
						title: story,
						urls:	tempUrlsArray
				});
				
			}
		}
		
		response = response.slice(response.indexOf("<!--- NEW STORIES GO HERE --->") + 29);
		response = response.slice(response.indexOf("<!--- CHANGE DRAMALINKS COLOR CODE HERE --->"));
		response = response.slice(response.indexOf("{{") + 2);	
		
		var dramalinksCode = response.slice(0, response.indexOf("}}")).toLowerCase();
		
		return {
			"code": dramalinksCode,
			"stories": stories
		};
	}
};


/**
  *	Getter for /test route data
  */

app.getTestHtml = () => {
		return "<div style=\"float: left; width:70%\" id=\"dramalinks-stories\">\
		\n<!--- TO KEEP TICKER WORKING: DO NOT USE HTTPS LINKS. DO USE HTML TAGS FOR BOLD AND ITALIC. --->\
		\n<!--- NEW STORIES GO HERE --->\
		\n* [[Username]] did something [http:\/\/boards.endoftheinter.net\/showmessages.php?topic=sometopic]\
		\n<!--- NEW STORIES END HERE --->\
		\n\<\/div>\r\n<!--- CHANGE DRAMALINKS COLOR CODE HERE --->\
		\n{{Orange}}"
};
