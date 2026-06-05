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
SuiteQL Query API

ID:
_suiteql_query_api

Description
An API that can be used to run SuiteQL queries.


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

20211205 - Tim Dietrich
- Initial public release.


*/


var 
	log,
	query,
	response = new Object();	


define( [ 'N/log', 'N/query' ], main );


function main( logModule, queryModule ) {

	log = logModule;
	query = queryModule;

    return { post: postProcess }

}


function postProcess( request ) {	
	
	try {
	
		if ( ( typeof request.query == 'undefined' ) || ( request.query === null ) || ( request.query == '' ) ) {		
			throw { 'type': 'error.SuiteAPIError', 'name': 'INVALID_REQUEST', 'message': 'No query was specified.' }
		}	
	
		if ( typeof request.params == 'undefined' ) { request.params = new Array(); }
					
		response.rows = query.runSuiteQL( { query: request.query, params: request.params } ).asMappedResults();	
							
		return response;
				
	} catch( e ) {	
		log.debug( { 'title': 'error', 'details': e } );
		return { 'error': { 'type': e.type, 'name': e.name, 'message': e.message } }
	}	
		
}