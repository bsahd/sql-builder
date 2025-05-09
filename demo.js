//@ts-check
import SQL from "./index.js";
import { DatabaseSync } from "node:sqlite";
const dbsq = new DatabaseSync(":memory:");
const db = new SQL(
	(q) => dbsq.exec(q),
	(q) => dbsq.prepare(q)
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
	.where(SQL.and(SQL.eq("name", "alice"), SQL.eq("age", 29)))
	.run();
console.log(db.select("users").run().all());
db.delete("users")
	.where(SQL.and(SQL.eq("name", "john' doe"), SQL.eq("age", 25)))
	.run();
console.log(db.select("users").run().all());
