var appRouter = function(app) {
	
	app.get("/", (req, res) => {
			if (app.cachedDrama.code !== "") {
				console.log("Returning cached drama");
				res.send(app.cachedDrama);
			}
			else {
				return "Waiting for server to update.";
			}
	});
	
	app.get("/test", (req, res) => {
		var testHtml = app.getTestHtml();
		res.send(app.parseResponse(testHtml));
	});
	
};
 
module.exports = appRouter;