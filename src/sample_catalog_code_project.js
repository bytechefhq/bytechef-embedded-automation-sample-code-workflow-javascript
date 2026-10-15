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
        },
        {
            name: "summarizeNewEmail",
            label: "Summarize New Email",
            description: "Runs for every new email in the connected user's inbox and logs who sent it.",
            // Provisioning binds the trigger to one of the connected user's Gmail connections - for example the
            // one they created when they connected a Gmail integration.
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "summary", task: "summarize"}],
            tasks: [
                {
                    name: "summarize",
                    label: "Summarize",
                    perform: function (context) {
                        const email = context.input("newEmail");

                        const summary = "New email from " + email.from + ": " + email.subject;

                        context.log("info", summary);

                        return summary;
                    }
                }
            ]
        },
        {
            name: "fetchRecentEmails",
            label: "Fetch Recent Emails",
            description: "Returns the connected user's most recent emails, optionally only those from one sender.",
            triggers: [{name: "request", type: "request/v1/awaitWorkflowAndRespond"}],
            outputs: [{name: "emails", task: "fetchEmails"}],
            tasks: [
                {
                    name: "fetchEmails",
                    label: "Fetch Emails",
                    // A task names the connections it uses. Provisioning binds each one to a connection of the
                    // connected user on the same component.
                    connections: [{componentName: "googleMail", name: "gmail"}],
                    perform: function (context) {
                        const request = context.input()["request"] || {};
                        const body = request.body || {};

                        const result = context.component.googleMail.searchEmail(
                            {from: body.from, maxResults: body.maxResults || 10}, "gmail");

                        context.log("info", "Found " + (result.messages || []).length + " emails");

                        return result.messages || [];
                    }
                }
            ]
        }
    ]
})
