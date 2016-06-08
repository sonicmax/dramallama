# dramallama

A simple JSON API for the dramalinks ticker on ETI, written using node.
Deploy using Heroku and add your username & password as environment variables.

Sample response:

`{
	"code": "orange",
	"stories": [{
		"title": "[[Username]] did something",
		"urls": ["http://boards.endoftheinter.net/showmessages.php?topic=sometopic"]
	}]
}`
