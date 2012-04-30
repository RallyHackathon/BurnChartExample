Ext.define('BurnChartApp', {
    extend:'Rally.app.App',
    mixins: {
        messageable: 'Rally.Messageable'
    },
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    appName:'Burn Chart',
    cls:'burnchart',
    items: [
        {
            id: 'rallytree1',
            xtype: 'rallytree',
            width: 400,
            height: '100%',
            topLevelModel: 'PortfolioItem',
            childModelTypeForRecordFn: function(record){
                if(record.get('Children') && record.get('Children').length > 0){
                    return 'Portfolio Item';
                }
            },
            parentAttributeForChildRecordFn: function(record){
                if(record.get('Children') && record.get('Children').length > 0){
                    return 'Parent';
                }
            }
        }

    ],

    initComponent: function() {
        this.callParent(arguments);
        //HACK! Because currently no way to know after tree displays items
        this.down('#rallytree1').on('add', Ext.Function.createBuffered(this._afterTreeRender, 1000, this));
    },

    launch: function () {

		
        this.chartQuery = {
            find:{
                _Type:'HierarchicalRequirement',
                Children:null,
                _ValidFrom: {
                    $gte: "2012-03-01T00:00:00Z"
                }
            }
        };

        this.chartConfigBuilder = Ext.create('Rally.app.analytics.BurnChartBuilder');

    },

    _afterChartConfigBuilt: function (chartConfig) {
        var chartCmp = this.down('#chartCmp');

        if (chartCmp) {
            this.remove(chartCmp);
        }
        this.add({
            id: 'chartCmp',
            xtype: 'highchart',
            flex: 1,
            chartConfig: chartConfig
        });
    },

    _afterTreeRender: function() {
        Ext.Array.each(
            Ext.DomQuery.select('.pill .textContent'),
            function(treeRowTextEl) {
                Ext.fly(treeRowTextEl).on('click', this._onTreeRowClick, this, {stopEvent: true});
            },
            this
        );
    },

    _onTreeRowClick: function(event, treeRowTextEl) {
        var treeItem = Ext.getCmp(Ext.get(treeRowTextEl).findParentNode('.treeItem').id);
        var itemId = treeItem.getRecord().get('ObjectID');
        var title = treeItem.getRecord().get('FormattedID') + ' - ' + treeItem.getRecord().get('Name');
        this._refreshChart(itemId, title);
    },

    _refreshChart: function(itemId, title) {
        this.chartQuery.find._ItemHierarchy = itemId;
        this.chartConfigBuilder.build(this.chartQuery, title, Ext.bind(this._afterChartConfigBuilt, this));
    }
});
