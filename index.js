import { DatabaseSync } from "node:sqlite";
function sqlSpecialChars(val) {
	if (val === null) return "NULL";
	if (typeof val === "string") return `'${val.replaceAll("'", "''")}'`;
	if (typeof val === "boolean") return val ? "1" : "0";
	return val;
}

class Condition {
	toString() {
		throw new Error("実装してね");
	}
}

class NotCondition extends Condition {
	constructor(cond) {
		super();
		this.cond = cond;
	}
	toString() {
		return `NOT (${this.cond.toString()})`; // 常に括弧つけるのが無難
	}
}

class BinaryCondition extends Condition {
	constructor(col, op, val) {
		super();
		this.col = col;
		this.op = op;
		this.val = val;
	}
	toString() {
		return `${this.col} ${this.op} ${sqlSpecialChars(this.val)}`;
	}
}

class LogicCondition extends Condition {
	constructor(op, conds) {
		super();
		this.op = op;
		this.conds = conds;
	}
	toString() {
		return this.conds.map((c) => `(${c.toString()})`).join(` ${this.op} `);
	}
}

class InsertQuery {
	constructor(table) {
		this.table = table;
		this._rows = [];
	}
	values(vals) {
		this._rows.push(vals);
		return this;
	}
	toString() {
		if (this._rows.length === 0) throw new Error("no values specified");

		const columns = this._rows
			.flatMap((a) => Object.keys(a))
			.filter((e, i, s) => s.indexOf(e) == i);
		const values = this._rows
			.map(
				(row) =>
					"(" +
					columns
						.map((v) => sqlSpecialChars(v in row ? row[v] : null))
						.join(", ") +
					")"
			)
			.join(", ");
		return `INSERT INTO ${this.table} (${columns.join(", ")}) VALUES ${values}`;
	}
}

class SelectQuery {
	constructor(table) {
		this.table = table;
		this.whereCond = null;
		this.orders = [];
	}
	where(cond) {
		if (this.whereCond) {
			throw new Error("cant define where conditions twice");
		}
		this.whereCond = cond;
		return this;
	}
	order(col, desc) {
		if (typeof col == "undefined" || typeof desc == "undefined") {
			throw new Error("please specify col and asc/desc");
		}
		this.orders.push({
			col,
			desc,
		});
		return this;
	}
	toString() {
		let sql = `SELECT * FROM ${this.table}`;
		if (this.whereCond) sql += ` WHERE ${this.whereCond.toString()}`;
		if (this.orders.length > 0)
			sql += ` ORDER BY ${this.orders
				.map((a) => `${a.col} ${a.desc ? "DESC" : "ASC"}`)
				.join(", ")}`;
		return sql;
	}
}

class UpdateQuery {
	constructor(table) {
		this.table = table;
		this.whereCond = null;
		this.sets = {};
	}
	set(col, val) {
		this.sets[col] = val;
		return this;
	}
	where(cond) {
		if (this.whereCond) {
			throw new Error("cant define where conditions twice");
		}
		this.whereCond = cond;
		return this;
	}
	toString() {
		let sql = `UPDATE ${this.table}`;
		sql += ` SET ${Object.entries(this.sets)
			.map(([k, v]) => `${k}=${sqlSpecialChars(v)}`)
			.join(", ")}`;
		if (this.whereCond) sql += ` WHERE ${this.whereCond.toString()}`;
		return sql;
	}
}

class DeleteQuery {
	constructor(table) {
		this.table = table;
		this.whereCond = null;
	}
	where(cond) {
		if (this.whereCond) {
			throw new Error("cant define where conditions twice");
		}
		this.whereCond = cond;
		return this;
	}
	toString() {
		let sql = `DELETE FROM ${this.table}`;
		if (this.whereCond) sql += ` WHERE ${this.whereCond.toString()}`;
		return sql;
	}
}

const SQL = {
	builder: {
		select(table) {
			return new SelectQuery(table);
		},
		insert(table) {
			return new InsertQuery(table);
		},
		delete(table) {
			return new DeleteQuery(table);
		},
		update(table) {
			return new UpdateQuery(table);
		},
	},
	ASC: false,
	DESC: true,
	eq(col, val) {
		return new BinaryCondition(col, "=", val);
	},
	neq(col, val) {
		return new BinaryCondition(col, "!=", val);
	},
	gte(col, val) {
		return new BinaryCondition(col, ">=", val);
	},
	lte(col, val) {
		return new BinaryCondition(col, "<=", val);
	},
	including(col, v) {
		return new BinaryCondition(col, "LIKE", `%${v}%`);
	},
	and(...conds) {
		return new LogicCondition("AND", conds);
	},
	or(...conds) {
		return new LogicCondition("OR", conds);
	},
	not(cond) {
		return new NotCondition(cond);
	},
};

if (import.meta.filename === process.argv[1]) {
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
}
