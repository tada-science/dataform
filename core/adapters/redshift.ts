import * as protos from "@dataform/protos";
import { IAdapter } from "./index";
import { Adapter } from "./base";
import { Task, Tasks } from "../tasks";

export class RedshiftAdapter extends Adapter implements IAdapter {
  private project: protos.IProjectConfig;

  constructor(project: protos.IProjectConfig) {
    super();
    this.project = project;
  }

  resolveTarget(target: protos.ITarget) {
    return `"${target.schema || this.project.defaultSchema}"."${target.name}"`;
  }

  publishTasks(t: protos.ITable, runConfig: protos.IRunConfig, tableMetadata: protos.ITableMetadata): Tasks {
    var tasks = Tasks.create();
    // Drop the existing view or table if we are changing it's type.
    if (tableMetadata && tableMetadata.type != this.baseTableType(t.type)) {
      tasks.add(Task.statement(this.dropIfExists(t.target, this.oppositeTableType(t.type))));
    }
    if (t.type == "incremental") {
      if (runConfig.fullRefresh || !tableMetadata || tableMetadata.type == "view") {
        tasks.addAll(this.createOrReplace(t));
      } else {
        // The table exists, insert new rows.
        tasks.add(
          Task.statement(this.insertInto(t.target, tableMetadata.fields.map(f => f.name), this.where(t.query, t.where)))
        );
      }
    } else {
      tasks.addAll(this.createOrReplace(t));
    }
    return tasks;
  }

  assertTasks(a: protos.IAssertion, projectConfig: protos.IProjectConfig): Tasks {
    var tasks = Tasks.create();
    var assertionTarget = protos.Target.create({
      schema: projectConfig.assertionSchema,
      name: a.name
    });
    tasks.add(Task.statement(this.createOrReplaceView(assertionTarget, a.query)));
    tasks.add(Task.assertion(`select count(*) as row_count from ${this.resolveTarget(assertionTarget)}`));
    return tasks;
  }

  createOrReplaceView(target: protos.ITarget, query: string) {
    return `
      create or replace view ${this.resolveTarget(target)} as ${query}`;
  }

  createOrReplace(t: protos.ITable) {
    if (t.type == "view") {
      return Tasks.create().add(
        Task.statement(`
        create or replace view ${this.resolveTarget(t.target)}
        as ${t.query}`)
      );
    } else {
      const tempTableTarget = protos.Target.create({
        schema: t.target.schema,
        name: t.target.name + "_temp"
      });

      const tasks = Tasks.create();
      tasks.add(Task.statement(this.dropIfExists(tempTableTarget, this.baseTableType(t.type))));
      tasks.add(Task.statement(this.createTable(t, tempTableTarget)));
      tasks.add(Task.statement(this.dropIfExists(t.target, "table")));
      tasks.add(Task.statement(`alter table ${this.resolveTarget(tempTableTarget)} rename to "${t.target.name}"`));
      return tasks;
    }
  }

  createTable(t: protos.ITable, target: protos.ITarget) {
    if (t.redshift) {
      let query = `create table ${this.resolveTarget(target)}`;

      if (t.redshift.distStyle && t.redshift.distKey) {
        query = `${query} diststyle ${t.redshift.distStyle} distkey (${t.redshift.distKey})`;
      }
      if (t.redshift.sortStyle && t.redshift.sortKeys) {
        query = `${query} ${t.redshift.sortStyle} sortkey (${t.redshift.sortKeys.join(", ")})`;
      }

      return `${query} as ${t.query}`;
    }

    return `create table ${this.resolveTarget(target)} as ${t.query}`;
  }

  dropIfExists(target: protos.ITarget, type: string) {
    return `drop ${this.baseTableType(type)} if exists ${this.resolveTarget(target)} cascade`;
  }
}
