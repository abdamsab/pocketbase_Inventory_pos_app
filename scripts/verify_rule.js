
const users = $app.dao().findCollectionByNameOrId("_pb_users_auth_");
console.log("Users Update Rule:", users.updateRule);

// Check if rule contains the admin constraint
if (users.updateRule.includes("@request.auth.role = 'admin'") && users.updateRule.includes("@request.data.superuser:isset = false")) {
    console.log("SUCCESS: Strict Superuser Rule is verified.");
} else {
    console.log("FAILURE: Rule does not match expectations.");
}
