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
            },
//            topLevelStoreConfig: {
//                listeners: {
//                    beforeload: function(tree) {
//                        tree.getEl().mask();
//                    },
//                    load: function(tree) {
//                        tree.getEl().unmask();
//                    }
//                }
//            },
            //override
            drawEmptyMsg: function(){
                if (Ext.getCmp('chartCmp')) {
                    Ext.getCmp('chartCmp').destroy();
                }
                this.add({
                    xtype: 'component',
                    html: '<p> No Portfolio Items within the currently scoped project(s).</p>'
                });
            }
        },
        {
            id: 'chartCmp',
            xtype: 'component',
            html: '<div>Choose a Portfolio Item from the list to see its burn chart.</div>'
        }

    ],

    initComponent: function() {
        this.callParent(arguments);
        //add the click handler to tree rows when they are added to the tree
        this.down('#rallytree1').on('add', this._onTreeRowAdd, this);
    },

    launch: function () {
        this.startTime = '2012-03-01T00:00:00Z';
        this.chartQuery = {
            find:{
                _Type:'HierarchicalRequirement',
                Children:null,
                _ValidFrom: {
                    $gte: this.startTime
                }
            }
        };

        this.chartConfigBuilder = Ext.create('Rally.app.analytics.BurnChartBuilder');

    },

    _afterChartConfigBuilt: function (success, chartConfig) {
        this._removeChartComponent();
        if (success){
            this.add({
                id: 'chartCmp',
                xtype: 'highchart',
                flex: 1,
                chartConfig: chartConfig
            });
        } else {
            var formattedId = this.selectedRowRecord.get('FormattedID');
            this.add({
                id: 'chartCmp',
                xtype: 'component',
                html: '<div>No user story data found for ' + formattedId + ' starting from: ' + this.startTime + '</div>'
            });
        }
    },

    _removeChartComponent: function() {
        var chartCmp = this.down('#chartCmp');
        if (chartCmp) {
            this.remove(chartCmp);
        }
    },

    _onTreeRowAdd: function(tree, treeRow) {
        treeRow.on('afterrender', this._afterTreeRowRendered, this);
    },

    _afterTreeRowRendered: function(treeRow) {
        treeRow.getEl().on('click', this._onTreeRowClick, this, {stopEvent: true});
    },

    _onTreeRowClick: function(event, treeRowTextEl) {
        var treeItem = Ext.getCmp(Ext.get(treeRowTextEl).findParentNode('.treeItem').id);
        var treeRowRecord = treeItem.getRecord();
        var itemId = treeRowRecord.get('ObjectID');
        var title = treeRowRecord.get('FormattedID') + ' - ' + treeRowRecord.get('Name');
        this._refreshChart(treeRowRecord, itemId, title);
    },

    _refreshChart: function(treeRowRecord, itemId, title) {
        this.selectedRowRecord = treeRowRecord;
        this.chartQuery.find._ItemHierarchy = itemId;
        this.chartConfigBuilder.build(this.chartQuery, title, Ext.bind(this._afterChartConfigBuilt, this));
    }
});
