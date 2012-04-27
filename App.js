Ext.define('BurnChartApp', {
    extend:'Rally.app.App',
    layout:'auto',
    appName:'Burn Chart',
    cls:'burnchart',

    launch: function () {
        var query = {
            find:{
                _Type:'HierarchicalRequirement',
                Children:null,
                _ItemHierarchy:5103024786,
                _ValidFrom: {
                    $gte: "2012-04-10T15:00:00Z"
                }
            }
        };

        var panel = this;
        var callback = function (chartConfiguration) {
            panel.add(chartConfiguration);
        };

        new Rally.app.analytics.BurnChartBuilder().build(query, callback);
    }
});
