({
    name: "Sample Catalog Code Project JavaScript",
    version: "1",
    description: "A sample embedded catalog code project.",
    workflows: [
        {
            name: "greetOnRequest",
            label: "Greet on Request",
            description: "Answers a request with a greeting.",
            // A request trigger makes the workflow callable through the embedded public endpoints.
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
                    // A code task's perform calls actions itself, so it declares the connections it uses; the name is
                    // what perform passes to the action. Provisioning binds each one to a connection of the connected
                    // user on the same component.
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
        },
        {
            name: "notifySlackOnNewEmail",
            label: "Notify Slack on New Email",
            description: "Posts every new email in the connected user's inbox to a Slack channel.",
            // Takes its options from Slack's channel input, so the channel is picked from the workspace's channels.
            inputs: [
                {
                    name: "channel", label: "Slack Channel", type: "STRING", required: true,
                    componentName: "slack", componentVersion: 1, groupName: "channel"
                }
            ],
            triggers: [{name: "newEmail", type: "googleMail/v1/newEmailPolling", parameters: {format: "SIMPLE"}}],
            outputs: [{name: "message", task: "postToSlack"}],
            tasks: [
                {
                    name: "postToSlack",
                    label: "Post to Slack",
                    description: "Posts the sender and subject with the Slack Send Channel Message action.",
                    // The Gmail trigger needs no declaration, but the task calls Slack itself, so it declares
                    // that connection and passes the name. Provisioning binds it to one of the connected user's
                    // Slack connections.
                    connections: [{componentName: "slack", name: "slack"}],
                    perform: function (context) {
                        const email = context.input("newEmail");

                        const text = "New email from " + email.from + ": " + email.subject;

                        const message = context.component.slack.sendChannelMessage(
                            {channel: context.input("channel"), text: text}, "slack");

                        context.log("info", "Posted to Slack: " + text);

                        return message;
                    }
                }
            ]
        }
    ]
})
