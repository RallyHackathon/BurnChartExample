(function () {

    Ext.define('Rally.app.analytics.BurnChartBuilder', {
        mixins:{
            componentUpdatable:'Rally.util.ComponentUpdatable'
        },
        build:function (requestedQuery, chartTitle, buildFinishedCallback) {

            this.chartTitle = chartTitle;
            this.buildFinishedCallback = buildFinishedCallback;
            this.query = {
                find: Ext.encode(requestedQuery.find),
                pagesize: 10000
            };
            this.requestedFields = Ext.Array.union(['_ValidFrom', '_ValidTo', 'ObjectID', 'ScheduleState'], requestedQuery.fields ? requestedQuery.fields : []);

            this.workspace = Rally.util.Ref.getOidFromRef(Rally.environment.getContext().context.scope.workspace._ref);

            if (this.acceptedScheduleStateOid && this.releasedScheduleStateOid) {
                this._queryAnalyticsApi();
            } else {
                if (!this.acceptedScheduleStateOid) {
                    this.acceptedScheduleStateOid = this.getAcceptedScheduleStateOid();
                }
                if (!this.releasedScheduleStateOid) {
                    this.releasedScheduleStateOid = this.getReleasedScheduleStateOid();
                }
            }

        },

        _afterAllScheduleStateOidsReturned: function() {
            this._queryAnalyticsApi();
        },

        _queryAnalyticsApi: function() {
            Ext.Ajax.request({
                url:"https://rally1.rallydev.com/analytics/1.27/" + this.workspace + "/artifact/snapshot/query.js?" + Ext.Object.toQueryString(this.query) +
                    "&fields=" + JSON.stringify(this.requestedFields) + "&sort={_ValidFrom:1}",
                method:"GET",
                success:function (response) {
                    this._afterQueryReturned(JSON.parse(response.responseText));
                },
                scope:this
            });
        },

        getAcceptedScheduleStateOid:function (callback) {
            this.markUpdating('BurnChartAcceptedScheduleState');
            var workspace = Rally.util.Ref.getOidFromRef(Rally.environment.getContext().context.scope.workspace._ref);
            var project = Rally.util.Ref.getOidFromRef(Rally.environment.getContext().context.scope.project._ref);
            var analyticsScheduleStateQuery = "find={ScheduleState:'Accepted',Project:" + project + "}&fields=['ScheduleState']&pagesize=1";
            Ext.Ajax.request({
                url:"https://rally1.rallydev.com/analytics/1.27/" + workspace + "/artifact/snapshot/query.js?" + analyticsScheduleStateQuery,
                method:"GET",
                success:function (response) {
                    this.acceptedScheduleStateOid = JSON.parse(response.responseText).Results[0].ScheduleState;
                    this.markUpdated('BurnChartAcceptedScheduleState', this._afterAllScheduleStateOidsReturned, this);
                },
                scope:this
            });
        },

        getReleasedScheduleStateOid:function (acceptedScheduleStateOid, callback) {
            this.markUpdating('BurnChartReleasedScheduleState');
            var workspace = Rally.util.Ref.getOidFromRef(Rally.environment.getContext().context.scope.workspace._ref);
            var project = Rally.util.Ref.getOidFromRef(Rally.environment.getContext().context.scope.project._ref);
            var analyticsScheduleStateQuery = "find={ScheduleState:'Released',Project:" + project + "}&fields=['ScheduleState']&pagesize=1";
            Ext.Ajax.request({
                url:"https://rally1.rallydev.com/analytics/1.27/" + workspace + "/artifact/snapshot/query.js?" + analyticsScheduleStateQuery,
                method:"GET",
                success:function (response) {
                    this.releasedScheduleStateOid = JSON.parse(response.responseText).Results[0].ScheduleState;
                    this.markUpdated('BurnChartReleasedScheduleState', this._afterAllScheduleStateOidsReturned, this);
                },
                scope:this
            });
        },
        _afterQueryReturned:function (queryResultsData) {
            var lumenize = require('./lumenize');
            var contextWorkspaceConfig = Rally.environment.getContext().context.scope.workspace.WorkspaceConfiguration;
            var workspaceConfiguration = {
                // Need to grab from Rally for this user
                DateFormat:contextWorkspaceConfig.DateFormat,
                DateTimeFormat:contextWorkspaceConfig.DateTimeFormat,
                //TODO: Have context code fetch these values for the workspace config, instead of hardcoding them
                IterationEstimateUnitName:'Points',
                // !TODO: Should we use this?
                ReleaseEstimateUnitName:'Points',
                TaskUnitName:'Hours',
                TimeTrackerEnabled:true,
                TimeZone:'America/Denver',
                WorkDays:'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'
                // They work on Sundays
            };
            var burnConfig = {
                workspaceConfiguration:workspaceConfiguration,
                upSeriesType:'Story Count',
                // 'Points' or 'Story Count'
                series:[
                    'up',
                    'scope'
                ],

                acceptedStates:[this.acceptedScheduleStateOid, this.releasedScheduleStateOid],
                start:"2012-03-01T00:00:00Z",
                // Calculated either by inspecting results or via configuration. pastEnd is automatically the last date in results
                holidays:[
                    {
                        month:12,
                        day:25
                    },
                    {
                        year:2011,
                        month:11,
                        day:26
                    },
                    {
                        year:2011,
                        month:1,
                        day:5
                    }
                ]
            };

            lumenize.ChartTime.setTZPath("");
            var tscResults = burnCalculator(queryResultsData.Results, burnConfig);

            var categories = tscResults.categories;
            var series = tscResults.series;
            var chartConfiguration = {
                chart:{
                    defaultSeriesType:'column'
                },
                credits:{
                    enabled:false
                },
                title:{
                    text: this.chartTitle
                },
                subtitle:{
                    text:''
                },
                xAxis:{
                    categories:categories,
                    tickmarkPlacement:'on',
                    tickInterval:Math.floor(categories.length / 13) + 1,
                    // set as a function of the length of categories
                    title:{
                        enabled:false
                    }
                },
                yAxis:[
                    {
                        title:{
                            text:'Hours'
                        },
                        labels:{
                            formatter:function () {
                                return this.value / 1;
                            }
                        },
                        min:0
                    },
                    {
                        title:{
                            text:burnConfig.upSeriesType
                        },
                        opposite:true,
                        labels:{
                            formatter:function () {
                                return this.value / 1;
                            }
                        },
                        min:0
                    }
                ],
                tooltip:{
                    formatter:function () {
                        return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
                    }
                },
                plotOptions:{
                    column:{
                        stacking:null,
                        lineColor:'#666666',
                        lineWidth:1,
                        marker:{
                            lineWidth:1,
                            lineColor:'#666666'
                        }
                    }
                },
                series:series
            };

            this.buildFinishedCallback(chartConfiguration);
        }
    });
})();