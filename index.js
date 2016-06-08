
/*
 *	Initial setup
 */
 
var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var request = require('request')

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.cookieJar = request.jar(); // Global cookie store
app.cachedDrama = { "code": "", "stories": [] };
 
var routes = require("./routes/routes.js")(app);

var deployTarget = process.env.PORT || 3000;

var server = app.listen(deployTarget, function() {	
		app.loginToBlueSite();
});


/**
	*	 Log into ETI using environment vars as credentials
	*/

app.loginToBlueSite = function() {
	const LOGIN_URL = "https://endoftheinter.net/";
	const formdata = { b: process.env.USERNAME, p: process.env.PASSWORD };
	
	request.post({
		
		headers: {"content-type": "application/x-www-form-urlencoded"},
		url: LOGIN_URL,
		form: formdata,
		jar: app.cookieJar
		
	}, (error, response, body) => {
		
			console.log(response.headers["location"]);
				
			// After successful login, ETI will attempt to redirect you to homepage
			if (!error && response.statusCode === 302) {
				
				if (app.cachedDrama.code !== "" && new Date().getTime() < app.cachedDrama.refreshTime) {
					callback(app.cachedDrama);
				}
				
				else {			
					app.cookieJar.setCookie("userid=5599");															
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
		const TEN_MINUTES = 600000;

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
		
		// Scrape URLs from each drama ticker entry
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
							tempUrlsArray.push(url);
						}
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
	*	Test data
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
