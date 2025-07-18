//@ts-check
import SQL from "./index.js";
import { DatabaseSync } from "node:sqlite";
const dbsq = new DatabaseSync(":memory:");
const db = new SQL(
  (q) => (console.log("sql", q), dbsq.exec(q)),
  (q) => (console.log("sql", q), dbsq.prepare(q)),
);
db.run("CREATE TABLE users(name VARCHAR, age INTEGER)");
db.insert("users")
  .values({ name: "john' doe", age: 25 })
  .values({ name: "alice", age: 29 })
  .values({ name: "bob", age: 31 })
  .run();
console.log(db.select("users").run().all());
db.update("users")
  .set("name", "charry")
  .set("age", 26)
  .where(SQL.eq("name", "alice"))
  .where(SQL.eq("age", 29))
  .run();
console.log(db.select("users").run().all());
db.delete("users").where(SQL.eq("name", "john' doe")).where(SQL.eq("age", 25)).run();
console.log(db.select("users").limit(1).order("name", SQL.DESC).run().all());
console.log(db.select("users").run().all());
