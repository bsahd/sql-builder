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
		const columns = Object.keys(this._rows[0]).join(", ");
		const values = this._rows
			.map(
				(row) =>
					"(" +
					Object.values(row)
						.map((v) => sqlSpecialChars(v))
						.join(", ") +
					")"
			)
			.join(", ");
		return `INSERT INTO ${this.table} (${columns}) VALUES ${values}`;
	}
}

class Query {
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

const SQL = {
	builder: {
		select(table) {
			return new Query(table);
		},
		insert(table) {
			return new InsertQuery(table);
		},
	},
	ASC: false,
	DESC: true,
	eq(col, val) {
		return new BinaryCondition(col, "=", val);
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
};

console.log(
	SQL.builder
		.select("users")
		.where(
			SQL.and(
				SQL.including("name", "john' doe"),
				SQL.gte("age", 20),
				SQL.lte("age", 30)
			)
		)
		.order("age", SQL.ASC) + ";"
);

console.log(
	SQL.builder.insert("users").values({ name: "jhon' doe", age: 25 }) + ";"
);
