Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [
        {
            xtype: 'rallytextfield',
            fieldLabel: 'Query',
            itemId: 'queryField',
            value: '{ObjectID: {$exists:true}}'
        },
        {
            xtype: 'rallybutton',
            text: 'Search',
            itemId: 'searchButton'
        },
        {
            xtype: 'panel',
            itemId: 'gridHolder',
            layout: 'fit'
        }
    ],
    
    launch: function() {
        var button = this.down('#searchButton')
        button.on('click', this.searchClicked, this);
    },
    
    searchClicked: function(){
        //TODO get from text field
        var selectedFields= ['ObjectID', '_UnformattedID', 'Name'];
        
        var queryField = this.down('#queryField');
        var query = queryField.getValue();

        var callback = Ext.bind(this.processSnapshots, this);
        this.doSearch(query, selectedFields, callback);
    },
    
    doSearch: function(query, fields, callback){
        var workspace = this.context.getWorkspace().ObjectID;
        var queryUrl = 'https://rally1.rallydev.com/analytics/1.32/'+ workspace +
                        '/artifact/snapshot/query.js'
    
        Ext.Ajax.cors = true;
        Ext.Ajax.request({
            url: queryUrl,
            method: 'GET',
            params: {
                find: query,
                fields: Ext.JSON.encode(fields)
            },
            success: function(response){
                var text = response.responseText;
                var json = Ext.JSON.decode(text);
                callback(json.Results, fields);
            }
        });
    },
    
    processSnapshots: function(snapshots, selectedFields){
        
        var snapshotStore = Ext.create('Ext.data.Store', {
            storeId:'snapshotStore',
            fields: selectedFields,
            data: {'items': snapshots},
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'items'
                }
            }
        });
        
        var columns = this.createColumnsForFields(selectedFields);
        var snapshotGrid = Ext.create('Ext.grid.Panel', {
            title: 'Snapshots',
            //store: Ext.data.StoreManager.lookup('simpsonsStore'),
            store: snapshotStore,
            columns: columns,
            height: 200,
            width: 400
        });
        
        var gridHolder = this.down('#gridHolder');
        gridHolder.removeAll(true);
        gridHolder.add(snapshotGrid);
    },
    
    createColumnsForFields: function(fields){
        var columns = [];
        for(var i=0; i < fields.length; ++i){
            var col = {
                header: fields[i],
                dataIndex: fields[i]
            };
            
            if(fields[i] === 'Name'){
                col.flex = 1;
            }
            columns.push(col);
        }
        
        return columns;
    }
});
