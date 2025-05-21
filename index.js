//@ts-check
/**
 * @param {string | null | boolean | number} val
 */
function sqlSpecialChars(val) {
	if (val === null) return "NULL";
	if (typeof val === "string") return `'${val.replaceAll("'", "''")}'`;
	if (typeof val === "boolean") return val ? "1" : "0";
	return val;
}

class Condition {
	/**
	 * @returns {string}
	 */
	toString() {
		throw new Error("実装してね");
	}
}

class NotCondition extends Condition {
	/**
	 * @param {Condition} cond
	 */
	constructor(cond) {
		super();
		this.cond = cond;
	}
	toString() {
		return `NOT (${this.cond.toString()})`; // 常に括弧つけるのが無難
	}
}

class BinaryCondition extends Condition {
	/**
	 * @param {string} col
	 * @param {string} op
	 * @param {string | null | boolean | number} val
	 */
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
	/**
	 * @param {string} op
	 * @param {Condition[]} conds
	 */
	constructor(op, conds) {
		super();
		this.op = op;
		this.conds = conds;
	}
	toString() {
		return this.conds.map((c) => `(${c.toString()})`).join(` ${this.op} `);
	}
}

/**
 * @template T
 */
class Query {
	/**
	 * @param {string} table
	 * @param {(sql:string)=>T} [executor]
	 */
	constructor(table, executor) {
		this.table = table;
		this.executor = executor;
	}
	/**
	 * @returns {string}
	 */
	toString() {
		throw new Error("実装してね");
	}
	run() {
		if (typeof this.executor != "function") {
			throw new Error("executor is not defined");
		}
		return this.executor(this.toString());
	}
}

/**
 * @template T
 * @extends {Query<T>}
 */
class InsertQuery extends Query {
	/**
	 * @param {string} table
	 * @param {(sql: string) => T} [executor]
	 */
	constructor(table, executor) {
		super(table, executor);
		this._rows = [];
	}
	/**
	 * @param {{[x in string]:(string|boolean|number|null)}} vals
	 * @returns
	 */
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

/**
 * @template T
 * @extends {Query<T>}
 */
class SelectQuery extends Query {
	/**
	 * @param {string} table
	 * @param {(sql: string) => T} [executor]
	 */
	constructor(table, executor) {
		super(table, executor);
		this.whereCond = [];
		this.orders = [];
		this.limitNum = 0;
	}
	/**
	 * @param {Condition} cond
	 */
	where(cond) {
		this.whereCond.push(cond);
		return this;
	}
	/**
	 * @param {string} col
	 * @param {boolean} desc
	 */
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
	/**
	 * @param {number} num
	 */
	limit(num) {
		this.limitNum = num;
		return this;
	}
	toString() {
		let sql = `SELECT * FROM ${this.table}`;
		if (this.whereCond.length)
			sql += ` WHERE ${SQL.and(...this.whereCond).toString()}`;
		if (this.orders.length > 0)
			sql += ` ORDER BY ${this.orders
				.map((a) => `${a.col} ${a.desc ? "DESC" : "ASC"}`)
				.join(", ")}`;
		if (this.limitNum != 0) sql += ` LIMIT ${this.limitNum}`;
		return sql;
	}
}

/**
 * @template T
 * @extends {Query<T>}
 */
class UpdateQuery extends Query {
	/**
	 * @param {string} table
	 * @param {(sql: string) => T} [executor]
	 */
	constructor(table, executor) {
		super(table, executor);
		this.whereCond = [];
		this.sets = {};
	}
	/**
	 * @param {string} col
	 * @param {string | number|boolean|null} val
	 */
	set(col, val) {
		this.sets[col] = val;
		return this;
	}
	/**
	 * @param {Condition} cond
	 */
	where(cond) {
		this.whereCond.push(cond);
		return this;
	}
	toString() {
		let sql = `UPDATE ${this.table}`;
		sql += ` SET ${Object.entries(this.sets)
			.map(([k, v]) => `${k}=${sqlSpecialChars(v)}`)
			.join(", ")}`;
		if (this.whereCond.length)
			sql += ` WHERE ${SQL.and(...this.whereCond).toString()}`;
		return sql;
	}
}

/**
 * @template T
 * @extends {Query<T>}
 */
class DeleteQuery extends Query {
	/**
	 * @param {string} table
	 * @param {(sql: string) => T} [executor]
	 */
	constructor(table, executor) {
		super(table, executor);
		this.whereCond = [];
	}
	/**
	 * @param {Condition} cond
	 */
	where(cond) {
		this.whereCond.push(cond);
		return this;
	}
	toString() {
		let sql = `DELETE FROM ${this.table}`;
		if (this.whereCond.length)
			sql += ` WHERE ${SQL.and(...this.whereCond).toString()}`;
		return sql;
	}
}

/**
 * @template ExecT
 * @template QueryT
 */
class SQL {
	static builder = {
		/**
		 * @param {string} table
		 */
		select(table) {
			return new SelectQuery(table);
		},
		/**
		 * @param {string} table
		 */
		insert(table) {
			return new InsertQuery(table);
		},
		/**
		 * @param {string} table
		 */
		delete(table) {
			return new DeleteQuery(table);
		},
		/**
		 * @param {string} table
		 */
		update(table) {
			return new UpdateQuery(table);
		},
	};
	static ASC = false;
	static DESC = true;
	/**
	 * @param {string} col
	 * @param {string | number | boolean} val
	 */
	static eq(col, val) {
		return new BinaryCondition(col, "=", val);
	}
	/**
	 * @param {string} col
	 * @param {string | number | boolean} val
	 */
	static neq(col, val) {
		return new BinaryCondition(col, "!=", val);
	}
	/**
	 * @param {string} col
	 * @param {string | number | boolean} val
	 */
	static gte(col, val) {
		return new BinaryCondition(col, ">=", val);
	}
	/**
	 * @param {string} col
	 * @param {string | number | boolean} val
	 */
	static lte(col, val) {
		return new BinaryCondition(col, "<=", val);
	}
	/**
	 * @param {string} col
	 * @param {string} v
	 */
	static including(col, v) {
		return new BinaryCondition(col, "LIKE", `%${v}%`);
	}
	/**
	 * @param {Condition[]} conds
	 */
	static and(...conds) {
		return new LogicCondition("AND", conds);
	}
	/**
	 * @param {Condition[]} conds
	 */
	static or(...conds) {
		return new LogicCondition("OR", conds);
	}
	/**
	 * @param {Condition} cond
	 */
	static not(cond) {
		return new NotCondition(cond);
	}
	/**
	 * @param {string} table
	 */
	select(table) {
		return new SelectQuery(table, this.selectExecutor);
	}
	/**
	 * @param {string} table
	 */
	insert(table) {
		return new InsertQuery(table, this.executor);
	}
	/**
	 * @param {string} table
	 */
	delete(table) {
		return new DeleteQuery(table, this.executor);
	}
	/**
	 * @param {string} table
	 */
	update(table) {
		return new UpdateQuery(table, this.executor);
	}
	/**
	 * @param {string} sql
	 */
	run(sql) {
		return this.executor(sql);
	}
	/**
	 *
	 * @param {(sql:string)=>ExecT} executor
	 * @param {(sql:string)=>QueryT} selectExecutor
	 */
	constructor(executor, selectExecutor) {
		this.executor = executor;
		this.selectExecutor = selectExecutor;
	}
}
export default SQL;
