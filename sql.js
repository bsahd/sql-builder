function sqlSpecialChars(val) {
	return typeof val === "string" ? `'${val.replaceAll("'", "''")}'` : val;
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
		this._values = {};
	}
	values(vals) {
		for (const key in vals) {
			this._values[key] = vals[key];
		}
		return this;
	}
	toString() {
		const columns = Object.keys(this._values).join(", ");
		const values = Object.values(this._values)
			.map((v) => sqlSpecialChars(v))
			.join(", ");
		return `INSERT INTO ${this.table} (${columns}) VALUES (${values})`;
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
