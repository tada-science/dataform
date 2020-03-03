# Dataform Navigator (Alpha)

Dataform Navigator is a data visualization tool built for quick and easy exploration of datasets.
This guide is written to help you get started.

Note: Dataform Navigator is still in Alpha. Expect bugs, incostencies and peculiar behaviour. We’re 
excited about working with you to find and resolve these things!

## Overall structure
Dataform Navigator has two top-level components: views and dashboards. They are configured using the
navigator.json file, which should be stored at the top level of your projects repository (i.e. at the
same level as your definitions and assertions folders).

Navigators can be found at: https://data.corp.dataform.co/{project_id}/views

## Navigator.json
Navigator.json is where views and dashboards are configured. The JSON contains a list of view objects,
and a list of dashboard objects. 

`navigator.json`:

```js
{
  "views": [{...},{...}],
  “dashboards”: [{...},{...}]
}
```

## Branches

Whilst editing the `navigator.json` in a branch, it's possible to view Dataform Navigator as per the current state of the
branch. To see this, use the following link: https://data.corp.dataform.co/b/{branch_name}/{project_id}/views

## Views

Views are used for exploring data within a table or view.

### Configuration
To create a new view, add a new view object to the `views` list. Views have the following format:


`navigator.json`:

```js
{
 "views": [
 {
      "name": "Users",
      "dimensions": [
        {
          "name": "Created at",
          "timestamp": "unix_millis(created_at)"
        },
        {
          "name": "User id",
          "category": "user_id"
        },
        {
          "name": "Organisation id",
          "category": "organisations"
        },
        {
          "name": "Days since signed up",
          "numeric": "days_since_signed_up"
        }
      ],
      "metrics": [
        {
          "name": "Users",
          "sum": "1",
          "id": "users"
        },
        {
          "name": "Organisations",
          "distinct": "organisation_id",
          "id": "organisations"
        },
        {
          "name": "Users per organisation",
          "derived": "organisations/users"
        },
        {
          "name": "New users",
          "sum": "if(days_since_signed_up=1, 1, 0)"
        },
      ],
      "description": "A view on dataform_data.users. Used for understanding our users.",
      "source": {
        "target": {
          "schema": "schema_name",
          "name": "table_name"
        }
      }
          ],
          "dashboards": []
}
```

### Usage

The default view, when first opening a view, is to see each metric summed over the entire period of the dataset. Filtering,
aggregating, pivoting and visualisation options are controlled in the top-left and and left-hand-side menus.

<img src="https://assets.dataform.co/docs/Screenshot%202020-03-03%20at%2015.00.33.png" />

#### x-axis selector
Either view metric totals across all-time, or aggregate against one of the timestamp dimensions within the view. Views can
have multiple timestamp dimensions

#### time-series controls
Filter to specific time windows, and change the granularity

#### Pivot selector
To pivot the metrics by a dimension, select the dimension from the pivot selector

#### Pivot ordering
We automatically select the top/bottom N values for the pivot dimension. Choose the metric by which to order the pivot 
dimension (and whether to sort ascending or descending).

#### Pivot depth
Choose how many values of the pivot dimension to show. Toggle on/off showing all other values (aggregated into an _other_
bucket).

#### % vs. abs
Show the pivot as a percent of total, or absolute values.

#### Filters
Choose dimensions to add filters for

#### Metric focus toggle
Highlight a specific metrics

#### Visualization options
Toggle between different visualisation options (e.g. horizontal vs. vertical bars)

## Dashboards

Dashboards are a place to _pin_ charts created within views.

To create a new dashboard, add a new _object_ to the `dashboards`. The functionality is currently relatively limited:

`navigator.json`:
```js
{
  "views": [{...},{...}],
  “dashboards”: [{"name": "New dashboard"}, {...}]
}
```

You will now see a card for the new dashboard on the home page:

<img src="https://assets.dataform.co/docs/Screenshot%202020-03-03%20at%2016.01.49.png" />

To add charts to the dashboard, use the menu from the chart cards within views. Note: for this to work, you 
need to be viewing Navigator from a _branch_.

<img src="https://assets.dataform.co/docs/Screenshot%202020-03-03%20at%2016.03.53.png" />

This will update the object you just added to `navigator.json`. To save the dashboard, you should follow the normal
commit/push process from app.dataform.co.

Note: it's also possible to update and add to dashboards by editing the JSON in `navigator.json` directly.
