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

class Query {
	constructor(table, executor) {
		this.table = table;
		this.executor = executor;
	}
	toString() {
		throw new Error("実装してね");
	}
	run() {
		if (typeof this.executor != "function") {
			throw new Error("executor is must function");
		}
		return this.executor(this.toString());
	}
}

class InsertQuery extends Query {
	constructor(table, executor) {
		super(table, executor);
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

class SelectQuery extends Query {
	constructor(table, executor) {
		super(table, executor);
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

class UpdateQuery extends Query {
	constructor(table, executor) {
		super(table, executor);
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

class DeleteQuery extends Query {
	constructor(table, executor) {
		super(table, executor);
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

class SQL {
	static builder = {
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
	};
	static ASC = false;
	static DESC = true;
	static eq(col, val) {
		return new BinaryCondition(col, "=", val);
	}
	static neq(col, val) {
		return new BinaryCondition(col, "!=", val);
	}
	static gte(col, val) {
		return new BinaryCondition(col, ">=", val);
	}
	static lte(col, val) {
		return new BinaryCondition(col, "<=", val);
	}
	static including(col, v) {
		return new BinaryCondition(col, "LIKE", `%${v}%`);
	}
	static and(...conds) {
		return new LogicCondition("AND", conds);
	}
	static or(...conds) {
		return new LogicCondition("OR", conds);
	}
	static not(cond) {
		return new NotCondition(cond);
	}
	select(table) {
		return new SelectQuery(table, this.selectExecutor);
	}
	insert(table) {
		return new InsertQuery(table, this.executor);
	}
	delete(table) {
		return new DeleteQuery(table, this.executor);
	}
	update(table) {
		return new UpdateQuery(table, this.executor);
	}
	run(sql) {
		return this.executor(sql);
	}
	constructor(executor, selectExecutor) {
		this.executor = executor;
		this.selectExecutor = selectExecutor;
	}
}
export default SQL;
