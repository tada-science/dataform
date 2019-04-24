import { Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import * as styles from "df/docs/components/navigation.css";
import * as React from "react";

export default class Navigation extends React.Component<any, any> {
  public render() {
    return (
      <div className={styles.sidebar}>
        <h4>Framework</h4>
        <Menu className={styles.menu}>
          <MenuItem href="/guides/core-concepts" text="Core concepts" />
          <MenuItem href="/guides/datasets" text="Publishing datasets" />
          <MenuItem href="/guides/incremental-datasets" text="Building incremental datasets" />
          <MenuItem href="/guides/includes" text="Re-usable code with includes" />
          <MenuItem href="/guides/operations" text="Custom SQL operations" />
          <MenuItem href="/guides/assertions" text="Testing data with assertions" />
          <MenuItem href="/guides/configuration" text="Project configuration" />
          <MenuItem href="/guides/js-api" text="JavaScript API" />
          <MenuItem href="/guides/command-line-interface" text="Command line interface" />
          <MenuDivider title="Warehouse integrations" />
          <div className={styles.indent1}>
            <MenuItem href="/guides/warehouses/bigquery" text="BigQuery" />
            <MenuItem href="/guides/warehouses/redshift" text="Redshift" />
          </div>
        </Menu>
        <h4>Web</h4>
        <Menu className={styles.menu}>
          <MenuItem
            href="/platform_guides/set_up_datawarehouse"
            text="Set up your cloud data warehouse"
          />
          <MenuItem href="/platform_guides/publish_tables" text="Publish your first datasets" />
          <MenuItem href="/platform_guides/version_control" text="Use version control" />
          <MenuItem href="/platform_guides/scheduling" text="Schedule runs" />
        </Menu>
        <h4>API reference</h4>
        <Menu className={styles.menu}>
          <MenuItem href="/reference/assertions" text="Assertions" />
          {/* <MenuItem href="/reference/contextable" text="Contextable<> Class" />*/}
          <MenuItem href="/reference/dataform-json" text="dataform.json" />
          <MenuItem href="/reference/js-api" text="JS API" />
          {/* <MenuItem href="/reference/table-config" text="TableConfig Class" /> */}
          <MenuItem href="/reference/operations" text="Operations" />
          <MenuItem href="/reference/datasets" text="Datasets" />
        </Menu>
      </div>
    );
  }
}
