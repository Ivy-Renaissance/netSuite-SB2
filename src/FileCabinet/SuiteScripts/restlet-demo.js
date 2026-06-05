/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], (record, log) => {

  const get = (request) => {
    log.debug('GET request', request);
    return { message: 'GET 小鹿奔奔成功访问！！！！', request };
  };

  const post = (request) => {
    log.debug('POST request', request);
    return { message: 'POST success', data: request };
  };

  const put = (request) => {
    log.debug('PUT request', request);
    return { message: 'PUT success', data: request };
  };

  const del = (request) => {
    log.debug('DELETE request', request);
    return { message: 'DELETE success', data: request };
  };

  return { get, post, put, delete: del };
});
