import SQL from "./index.js";
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE users(name VARCHAR, age INTEGER)");

db.exec(
	SQL.builder
		.insert("users")
		.values({ name: "john' doe", age: 25 })
		.values({ name: "alice", age: 29 })
		.values({ name: "bob", age: 31 })
		.toString()
);
console.log(db.prepare(SQL.builder.select("users").toString()).all());
db.exec(
	SQL.builder
		.update("users")
		.set("name", "charry")
		.set("age", 26)
		.where(SQL.and(SQL.eq("name", "alice"), SQL.eq("age", 29)))
		.toString()
);
console.log(db.prepare(SQL.builder.select("users").toString()).all());
db.exec(
	SQL.builder
		.delete("users")
		.where(SQL.and(SQL.eq("name", "john' doe"), SQL.eq("age", 25)))
		.toString()
);
console.log(db.prepare(SQL.builder.select("users").toString()).all());
