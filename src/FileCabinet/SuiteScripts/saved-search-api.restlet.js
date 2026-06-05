/**
* @NApiVersion 2.1
* @NScriptType Restlet
* @NModuleScope Public
*/

/* 

------------------------------------------------------------------------------------------
Script Information
------------------------------------------------------------------------------------------

Name:
Saved Search API

ID:
_saved_search_api

Description
An API that can be used to provide data via saved searches.


------------------------------------------------------------------------------------------
MIT License
------------------------------------------------------------------------------------------

Copyright (c) 2021 Timothy Dietrich.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


------------------------------------------------------------------------------------------
Developer
------------------------------------------------------------------------------------------

Tim Dietrich
* timdietrich@me.com
* https://timdietrich.me


------------------------------------------------------------------------------------------
History
------------------------------------------------------------------------------------------

20211207 - Tim Dietrich
- Initial public release.


*/


var 
	log,
	search,
	response = new Object();	


define( [ 'N/log', 'N/search' ], main );


function main( logModule, searchModule ) {

	log = logModule;
	search = searchModule;

    return { post: postProcess }

}


function postProcess( request ) {	
	
	try {
	
		if ( ( typeof request.searchID == 'undefined' ) || ( request.searchID === null ) || ( request.searchID == '' ) ) {		
			throw { 'type': 'error.SavedSearchAPIError', 'name': 'INVALID_REQUEST', 'message': 'No searchID was specified.' }			
		}	

		var searchObj = search.load( { id: request.searchID } );

		response.results = [];

		var resultSet = searchObj.run();

		var start = 0;

		var results = [];

		do {
	
			results = resultSet.getRange( { start: start, end: start + 1000 } );
		
			start += 1000;
		
			response.results = response.results.concat( results ) ;
		
		} while ( results.length );		
									
		return response;
				
	} catch( e ) {	
		log.debug( { 'title': 'error', 'details': e } );
		return { 'error': { 'type': e.type, 'name': e.name, 'message': e.message } }
	}	
		
}

