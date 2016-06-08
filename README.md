# dramallama

http://dramallama.herokuapp.com/

A simple JSON API for the dramalinks ticker on ETI, written using node. Deploy using Heroku.

Required environment vars:

	<pre>USERNAME:</pre> your username
	<pre>PASSWORD:</pre> your password
	<pre>USER_ID:</pre> your user id

Sample response:

<pre>{
	"code": "orange",
	"stories": [{
		"title": "[[Username]] did something",
		"urls": ["http://boards.endoftheinter.net/showmessages.php?topic=sometopic"]
	}]
}</pre>
