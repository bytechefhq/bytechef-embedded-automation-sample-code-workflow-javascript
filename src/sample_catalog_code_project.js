({
    name: "Sample Catalog Code Project JavaScript",
    version: "1",
    description: "A sample embedded catalog code project.",
    workflows: [
        {
            name: "greetOnRequest",
            label: "Greet on Request",
            description: "Answers a request with a greeting.",
            // A catalog workflow is only reachable through the embedded public endpoints when it declares a
            // request trigger or an app-event trigger. Without one the import still succeeds, with a warning.
            triggers: [{name: "request", type: "request/v1/autoRespondWithHTTP200"}],
            outputs: [{name: "greeting", task: "greet"}],
            tasks: [
                {
                    name: "greet",
                    label: "Greet",
                    perform: function (context) {
                        context.log("info", "Greeting from the embedded catalog");

                        return "Hello from the embedded catalog";
                    }
                }
            ]
        }
    ]
})
