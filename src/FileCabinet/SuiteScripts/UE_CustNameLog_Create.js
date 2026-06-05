    /** * @NApiVersion 2.x
     * @NScriptType UserEventScript
     * @NModuleScope SameAccount
     */
    define(['N/record', 'N/search'], function(record, search) {
    
      function beforeSubmit(context) {
    if (context.type === context.UserEventType.CREATE) {
      var newRecord = context.newRecord;
      var customerId = newRecord.getValue({ fieldId: 'entity' });
      var customerSearch = search.create({
        type: search.Type.CUSTOMER,
        filters: [
          ['internalid', 'is', customerId]
        ],
        columns: [
          search.createColumn({ name: 'companyname', sort: search.Sort.ASC, label: 'Name' })
        ]
      });
      var searchResult = customerSearch.run().getRange({ start: 0, end: 1 });
      log.debug({
        title: 'Customer Name',
        details: searchResult[0].getValue({ name: 'companyname' })
      });
    }
      }
    
      return {
    beforeSubmit: beforeSubmit
      };
    
    });
