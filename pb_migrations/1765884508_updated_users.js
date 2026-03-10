/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.superuser = true",
    "deleteRule": "@request.auth.superuser = true",
    "listRule": "@request.auth.superuser = true || @request.auth.role = 'admin'",
    "manageRule": "@request.auth.superuser = true",
    "updateRule": "@request.auth.superuser = true || (@request.auth.role = 'admin' && @request.auth.id != id)",
    "viewRule": "@request.auth.superuser = true || @request.auth.role = 'admin' || @request.auth.id = id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "",
    "deleteRule": "id = @request.auth.id",
    "listRule": "@request.auth.role = 'admin'",
    "manageRule": null,
    "updateRule": "id = @request.auth.id",
    "viewRule": "@request.auth.role = 'admin' || @request.auth.id = id"
  }, collection)

  return app.save(collection)
})
