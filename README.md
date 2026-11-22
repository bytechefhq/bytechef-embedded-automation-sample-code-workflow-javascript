# bytechef-embedded-automation-sample-code-workflow-javascript

A sample ByteChef **embedded catalog code project** written in JavaScript. The whole project is one file,
[`src/sample_catalog_code_project.js`](src/sample_catalog_code_project.js), and that file is what you deploy - there
is no build step. The file is a single parenthesized object expression, `({ ... })`. The server evaluates it and
reads the object's `name`, `description`, `version` and `workflows`, then calls each task's `perform(input, context)`
when the workflow runs. Keep it a bare expression: a bundler or module wrapper hides the object from the server.

A catalog project is an ordinary automation code project - the same format the automation `ProjectHandler` path
parses - imported under Embedded → **Automations** (the Automation Workflows page) instead of Automation → Projects.
Importing publishes it to the embedded catalog straight away. A catalog workflow is called through the embedded public
endpoints by its **request** or **app-event** (`appEvent/newEvent`) trigger, or runs on its own when a component
trigger such as Gmail **New Email** starts it. A workflow with no trigger that can start it - none, or only a manual
one - still imports, but the import returns a warning for it (the UI keeps the dialog open and shows the warning).

The project, "Sample Catalog Code Project JavaScript", has five workflows:

- `greetOnRequest`, started by a `request/v1/autoRespondWithHTTP200` trigger. It runs one task, `greet`, that logs and
  returns a greeting, and exposes that as the `greeting` output.
- `summarizeNewEmail`, started by the Gmail **New Email** polling trigger (`googleMail/v1/newEmailPolling`). It runs
  once for every new email in the connected user's inbox and returns a one-line summary as the `summary` output. It
  has no request trigger, so it needs no call - once provisioned and enabled it runs whenever an email arrives.
- `fetchRecentEmails`, started by a `request/v1/awaitWorkflowAndRespond` trigger. Its `fetchEmails` task calls the Gmail
  **Search Email** action and returns the matching messages as the `emails` output. The optional request body
  `{"from": "...", "maxResults": 5}` narrows the search.
- `notifySlackOnNewEmail`, started by the Gmail **New Email** trigger, with a required `channel` input; its options come
  from Slack's own `channel` input (`componentName`, `componentVersion` and `groupName` on the input), so it is picked
  from the Slack workspace's channels. Its `postToSlack` task calls the Slack **Send Channel Message** action, so it
  declares a `slack` connection and passes its name. Provisioning binds it to one of the connected user's Slack
  connections; a user with none gets the reference created disabled and a `409` naming `slack`.
- `logNewEmailSender`, started by the Gmail **New Email** trigger. Its `describe` task picks the sender and
  subject out of the new email, and its `logSender` task is a component task that runs the Logger **Info** action with
  them, so the execution log shows one line per email.

### Component tasks

A task that only runs a component action, with no logic of its own, can name the action by type instead of declaring
a `perform` function, the same way a trigger names its component:

```javascript
{
    name: "logSender",
    type: "logger/v1/info",
    parameters: {text: "New email from ${describe.sender}: ${describe.subject}"}
}
```

The type is `<component>/v<version>/<action>`, and `parameters` holds the action's inputs. A `${...}` expression is
evaluated when the task runs: `"${describe}"` is the whole output of the `describe` task, `"${describe.sender}"` one of
its fields, and text such as `"New email from ${describe.sender}: ${describe.subject}"` becomes a string with the
values filled in. A component task declares no connections: when its action needs one, it is bound like the
same task's in a visual workflow. Importing the deployed project fails when the component, its version or the action does not exist
on the server.

### Connections

A task names the connections it uses and calls a component action through one of them:

```javascript
connections: [{componentName: "googleMail", name: "gmail"}],
perform: function (input, context) {
    return context.component.googleMail.searchEmail({maxResults: 10}, "gmail");
}
```

When a connected user provisions a reference to a workflow, ByteChef binds every declared connection, and every
component trigger, to one of that user's connections on the same component - for example the one they created when
they connected a Gmail integration. Pass `{"connections": {"googleMail": <connectionId>}}` in the provision body to pick
one. A user with no Gmail connection gets the reference created disabled and a `409` naming the missing component
(`missingConnectionComponentName`).

## Check

```bash
npm run check
```

Evaluates the file the same way the server does, checks its shape and runs each task once with a stub context. A component task prints its action type and its
parameters with the `${...}` expressions filled in. It
needs only Node.js; the JavaScript file has no dependencies to install.

## TypeScript

[`src/sample_catalog_code_project.ts`](src/sample_catalog_code_project.ts) is the same project written in TypeScript. It
takes its types from [`@bytechef/workflow-api`](https://www.npmjs.com/package/@bytechef/workflow-api) through a
`/// <reference types="@bytechef/workflow-api" />` directive and ends in `satisfies ByteChef.ProjectDefinition`, so a
missing `name` or a misspelled `perform` fails the build. TypeScript does not infer the parameter types of a
two-parameter `perform`, so each one annotates `input` and `context` with `ByteChef.TaskInput` and
`ByteChef.TaskContext`. The server runs only JavaScript, so compile the file and deploy the output:

```bash
npm install
npm run check:ts
```

`check:ts` compiles the file to `dist/sample_catalog_code_project.js` and runs the same check on it. Deploy
`dist/sample_catalog_code_project.js` in place of `src/sample_catalog_code_project.js`; the directive and `satisfies`
leave nothing behind, so the output is the same bare `({ ... })` expression. Don't `import` or `export` anything in the
`.ts` file: either one turns it into a module, the output stops being a bare expression and the check fails. It is named
"Sample Catalog Code Project TypeScript", so deploying it publishes a catalog project of its own next to the JavaScript
one.

## Deploy

Upload `src/sample_catalog_code_project.js`. Deploying a project with the same name again publishes a new version of
that catalog project instead of creating a second one.

### From the UI

Embedded → **Automations** → the arrow next to **New Project** → **Import Code Project**, then pick the file.

### Through the public API

`POST /api/embedded/v1/automation-project-code-workflows/deploy` with a `multipart/form-data` body holding one file
part, `projectFile`: the `.js` file. The file name must end in `.js`; the server picks the language from the
extension. A successful deploy returns `200` with the import warnings, for example `{"warnings": []}`.
`GET /api/embedded/v1/automation-project-code-workflows` lists the published catalog projects.

Authenticate with `Authorization: Bearer <API key>`, using an **Embedded API key** (Embedded → Settings →
**API Keys**) that belongs to an administrator - deploying requires the admin role. This endpoint takes only a typed
API key: an organization admin key (Settings → Organization → **Admin API Keys**) is rejected with `401`. The key is
looked up in the environment named by the `X-ENVIRONMENT` header (`DEVELOPMENT`, `STAGING` or `PRODUCTION`;
`PRODUCTION` when the header is absent), so send the environment the key was created in. The request runs as the
key's own ByteChef user, not as a connected user.

```bash
curl -X POST "$BYTECHEF_URL/api/embedded/v1/automation-project-code-workflows/deploy" \
  -H "Authorization: Bearer $BYTECHEF_EMBEDDED_API_KEY" \
  -H "X-ENVIRONMENT: DEVELOPMENT" \
  -F "projectFile=@src/sample_catalog_code_project.js"
```

`BYTECHEF_URL` is the server's base URL, for example `http://localhost:9555` for a local development server.
