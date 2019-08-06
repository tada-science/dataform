import * as adapters from "@dataform/core/adapters";
import { AContextable, Assertion } from "@dataform/core/assertion";
import { OContextable, Operation } from "@dataform/core/operation";
import { Table, TConfig, TContextable } from "@dataform/core/table";
import { Test } from "@dataform/core/test";
import * as utils from "@dataform/core/utils";
import { dataform } from "@dataform/protos";

interface IActionProto {
  name?: string;
  fileName?: string;
  dependencies?: string[];
}

interface ISqlxConfig extends TConfig {
  type: "view" | "table" | "inline" | "incremental" | "assertion" | "operations" | "test";
  schema?: string;
  name: string;
  hasOutput?: boolean;
  dataset?: string;
  tags?: string[];
}

export interface IColumnsDescriptor {
  [name: string]: string | IRecordDescriptor;
}

interface IRecordDescriptor {
  description?: string;
  columns?: IColumnsDescriptor;
}

export function mapToColumnProtoArray(columns: IColumnsDescriptor): dataform.IColumnDescriptor[] {
  return utils.flatten(
    Object.keys(columns).map(column => mapColumnDescriptionToProto([column], columns[column]))
  );
}

function mapColumnDescriptionToProto(
  currentPath: string[],
  description: string | IRecordDescriptor
): dataform.IColumnDescriptor[] {
  if (typeof description === "string") {
    return [
      dataform.ColumnDescriptor.create({
        description,
        path: currentPath
      })
    ];
  }
  const columnDescriptor: dataform.IColumnDescriptor[] = description.description
    ? [
        dataform.ColumnDescriptor.create({
          description: description.description,
          path: currentPath
        })
      ]
    : [];
  const nestedColumns = description.columns ? Object.keys(description.columns) : [];
  return columnDescriptor.concat(
    utils.flatten(
      nestedColumns.map(nestedColumn =>
        mapColumnDescriptionToProto(
          currentPath.concat([nestedColumn]),
          description.columns[nestedColumn]
        )
      )
    )
  );
}

export class Session {
  public rootDir: string;

  public config: dataform.IProjectConfig;

  public tables: { [name: string]: Table };
  public operations: { [name: string]: Operation };
  public assertions: { [name: string]: Assertion };
  public tests: { [name: string]: Test };

  public graphErrors: dataform.IGraphErrors;

  constructor(rootDir: string, projectConfig?: dataform.IProjectConfig) {
    this.init(rootDir, projectConfig);
  }

  public init(rootDir: string, projectConfig?: dataform.IProjectConfig) {
    this.rootDir = rootDir;
    this.config = projectConfig || {
      defaultSchema: "dataform",
      assertionSchema: "dataform_assertions"
    };
    this.tables = {};
    this.operations = {};
    this.assertions = {};
    this.tests = {};
    this.graphErrors = { compilationErrors: [] };
  }

  public adapter(): adapters.IAdapter {
    return adapters.create(this.config);
  }

  public sqlxAction(actionOptions: {
    sqlxConfig: ISqlxConfig;
    sqlStatementCount: number;
    hasIncremental: boolean;
    hasPreOperations: boolean;
    hasPostOperations: boolean;
    hasInputs: boolean;
  }) {
    if (actionOptions.sqlStatementCount > 1 && actionOptions.sqlxConfig.type !== "operations") {
      this.compileError(
        "Actions may only contain more than one SQL statement if they are of type 'operations'."
      );
    }
    if (
      actionOptions.sqlxConfig.hasOutput &&
      (actionOptions.sqlxConfig.type !== "operations" ||
        this.isDatasetType(actionOptions.sqlxConfig.type))
    ) {
      this.compileError(
        "Actions may only specify 'hasOutput: true' if they are of type 'operations' or create a dataset."
      );
    }
    if (
      actionOptions.sqlxConfig.columns &&
      !(this.isDatasetType(actionOptions.sqlxConfig.type) || actionOptions.sqlxConfig.hasOutput)
    ) {
      this.compileError("Actions may only specify 'columns' if they create a dataset.");
    }
    if (actionOptions.sqlxConfig.protected && actionOptions.sqlxConfig.type !== "incremental") {
      this.compileError(
        "Actions may only specify 'protected: true' if they are of type 'incremental'."
      );
    }
    if (actionOptions.hasIncremental && actionOptions.sqlxConfig.type !== "incremental") {
      this.compileError(
        "Actions may only include incremental_where if they are of type 'incremental'."
      );
    }
    if (actionOptions.sqlxConfig.dataset && actionOptions.sqlxConfig.type !== "test") {
      this.compileError("Actions may only specify 'dataset' if they are of type 'test'.");
    }
    if (!actionOptions.sqlxConfig.dataset && actionOptions.sqlxConfig.type === "test") {
      this.compileError("Actions must specify 'dataset' if they are of type 'test'.");
    }
    if (actionOptions.hasInputs && actionOptions.sqlxConfig.type !== "test") {
      this.compileError("Actions may only include input blocks if they are of type 'test'.");
    }
    if (actionOptions.sqlxConfig.disabled && !this.isDatasetType(actionOptions.sqlxConfig.type)) {
      this.compileError("Actions may only specify 'disabled: true' if they create a dataset.");
    }
    if (actionOptions.sqlxConfig.redshift && !this.isDatasetType(actionOptions.sqlxConfig.type)) {
      this.compileError("Actions may only specify 'redshift: { ... }' if they create a dataset.");
    }
    if (actionOptions.sqlxConfig.bigquery && !this.isDatasetType(actionOptions.sqlxConfig.type)) {
      this.compileError("Actions may only specify 'bigquery: { ... }' if they create a dataset.");
    }
    if (actionOptions.hasPreOperations && !this.isDatasetType(actionOptions.sqlxConfig.type)) {
      this.compileError("Actions may only include pre_operations if they create a dataset.");
    }
    if (actionOptions.hasPostOperations && !this.isDatasetType(actionOptions.sqlxConfig.type)) {
      this.compileError("Actions may only include post_operations if they create a dataset.");
    }

    if (actionOptions.sqlxConfig.type === "test") {
      return this.test(actionOptions.sqlxConfig.name).dataset(actionOptions.sqlxConfig.dataset);
    }

    const action = (() => {
      switch (actionOptions.sqlxConfig.type) {
        case "view":
        case "table":
        case "inline":
        case "incremental":
          return this.publish(actionOptions.sqlxConfig.name).config(actionOptions.sqlxConfig);
        case "assertion":
          return this.assert(actionOptions.sqlxConfig.name)
            .dependencies(actionOptions.sqlxConfig.dependencies)
            .tags(actionOptions.sqlxConfig.tags);
        case "operations": {
          const operations = this.operate(actionOptions.sqlxConfig.name)
            .dependencies(actionOptions.sqlxConfig.dependencies)
            .tags(actionOptions.sqlxConfig.tags);
          if (!actionOptions.sqlxConfig.hasOutput) {
            delete operations.proto.target;
          }
          return operations;
        }
        default:
          throw new Error(`Unrecognized action type: ${actionOptions.sqlxConfig.type}`);
      }
    })();
    if (action.proto.target) {
      const finalSchema =
        actionOptions.sqlxConfig.schema ||
        (actionOptions.sqlxConfig.type === "assertion"
          ? this.config.assertionSchema
          : this.config.defaultSchema);
      action.proto.target = this.target(actionOptions.sqlxConfig.name, finalSchema);
    }
    return action;
  }

  public target(target: string, defaultSchema?: string): dataform.ITarget {
    const suffix = !!this.config.schemaSuffix ? `_${this.config.schemaSuffix}` : "";

    if (target.includes(".")) {
      const [schema, name] = target.split(".");
      return dataform.Target.create({ name, schema: schema + suffix });
    }
    return dataform.Target.create({
      name: target,
      schema: (defaultSchema || this.config.defaultSchema) + suffix
    });
  }

  public resolve(name: string): string {
    const table = this.tables[name];
    const operation =
      !!this.operations[name] && this.operations[name].hasOutput && this.operations[name];

    if (table && table.proto.type === "inline") {
      // TODO: Pretty sure this is broken as the proto.query value may not
      // be set yet as it happens during compilation. We should evalute the query here.
      return `(${table.proto.query})`;
    }

    const dataset = table || operation;
    // TODO: We fall back to using the plain 'name' here for backwards compatibility with projects that use .sql files.
    // In these projects, this session may not know about all actions (yet), and thus we need to fall back to assuming
    // that the target *will* exist in the future. Once we break backwards compatibility with .sql files, we should remove
    // the code that calls 'this.target(...)' below, and append a compile error if we can't find a dataset whose name is 'name'.
    const target = dataset ? dataset.proto.target : this.target(name);
    return this.adapter().resolveTarget(target);
  }

  public operate(name: string, queries?: OContextable<string | string[]>): Operation {
    this.checkActionNameIsUnused(name);
    const operation = new Operation();
    operation.session = this;
    operation.proto.name = name;
    operation.proto.target = this.target(name);
    if (queries) {
      operation.queries(queries);
    }
    operation.proto.fileName = utils.getCallerFile(this.rootDir);
    // Add it to global index.
    this.operations[name] = operation;
    return operation;
  }

  public publish(name: string, queryOrConfig?: TContextable<string> | TConfig): Table {
    this.checkActionNameIsUnused(name);
    const table = new Table();
    table.session = this;
    table.proto.name = name;
    table.proto.target = this.target(name);
    if (!!queryOrConfig) {
      if (typeof queryOrConfig === "object") {
        table.config(queryOrConfig);
      } else {
        table.query(queryOrConfig);
      }
    }
    table.proto.fileName = utils.getCallerFile(this.rootDir);
    // Add it to global index.
    this.tables[name] = table;
    return table;
  }

  public assert(name: string, query?: AContextable<string>): Assertion {
    this.checkActionNameIsUnused(name);
    const assertion = new Assertion();
    assertion.session = this;
    assertion.proto.name = name;
    assertion.proto.target = this.target(name, this.config.assertionSchema);
    if (query) {
      assertion.query(query);
    }
    assertion.proto.fileName = utils.getCallerFile(this.rootDir);
    // Add it to global index.
    this.assertions[name] = assertion;
    return assertion;
  }

  public test(name: string): Test {
    this.checkTestNameIsUnused(name);
    const test = new Test();
    test.session = this;
    test.proto.name = name;
    test.proto.fileName = utils.getCallerFile(this.rootDir);
    // Add it to global index.
    this.tests[name] = test;
    return test;
  }

  public compileError(err: Error | string, path?: string) {
    const fileName = path || utils.getCallerFile(this.rootDir) || __filename;

    const compileError = dataform.CompilationError.create({
      fileName
    });
    if (typeof err === "string") {
      compileError.message = err;
    } else {
      compileError.message = err.message;
      compileError.stack = err.stack;
    }
    this.graphErrors.compilationErrors.push(compileError);
  }

  public compileGraphChunk<T>(part: {
    [name: string]: { proto: IActionProto; compile(): T };
  }): T[] {
    const compiledChunks: T[] = [];

    Object.keys(part).forEach(key => {
      try {
        const compiledChunk = part[key].compile();
        compiledChunks.push(compiledChunk);
      } catch (e) {
        this.compileError(e, part[key].proto.fileName);
      }
    });

    return compiledChunks;
  }

  public compile(): dataform.ICompiledGraph {
    const compiledGraph = dataform.CompiledGraph.create({
      projectConfig: this.config,
      tables: this.compileGraphChunk(this.tables),
      operations: this.compileGraphChunk(this.operations),
      assertions: this.compileGraphChunk(this.assertions),
      tests: this.compileGraphChunk(this.tests),
      graphErrors: this.graphErrors
    });

    // Expand action dependency wildcards.

    const allActions: IActionProto[] = [].concat(
      compiledGraph.tables,
      compiledGraph.assertions,
      compiledGraph.operations
    );
    const allActionNames = allActions.map(action => action.name);

    allActions.forEach(action => {
      const uniqueDependencies: { [dependency: string]: boolean } = {};
      const dependencies = action.dependencies || [];
      // Add non-wildcard deps normally.
      dependencies
        .filter(dependency => !dependency.includes("*"))
        .forEach(dependency => (uniqueDependencies[dependency] = true));
      // Match wildcard deps against all action names.
      utils
        .matchPatterns(dependencies.filter(d => d.includes("*")), allActionNames)
        .forEach(dependency => (uniqueDependencies[dependency] = true));
      action.dependencies = Object.keys(uniqueDependencies);
    });

    return compiledGraph;
  }

  public isDatasetType(type) {
    return type === "view" || type === "table" || type === "inline" || type === "incremental";
  }

  private checkActionNameIsUnused(name: string) {
    // Check for duplicate names
    if (this.tables[name] || this.operations[name] || this.assertions[name]) {
      const message = `Duplicate action name detected. Names must be unique across tables, assertions, and operations: "${name}"`;
      this.compileError(new Error(message));
    }
  }

  private checkTestNameIsUnused(name: string) {
    // Check for duplicate names
    if (this.tests[name]) {
      const message = `Duplicate test name detected: "${name}"`;
      this.compileError(new Error(message));
    }
  }
}
