THIS IS NO LONGER USED> REPLACE WITH NOCK>


Many middlewares make calls to external APIs. They do this via the request_maker in lib/utils.js.

In order to unit test these middlewares, we mock the request maker so that the on_success and
on_error callbacks are given hardcoded data and errors.

This hardcoded data is expressed in the files in this folder.

Each mock is actually a factory that returns a request maker. The factory takes two parameters:

 * @param {boolean} xhr_error if True, call the on_error callback rather than on_success
 * @param {boolean} data_error if True and if on_success is called, provide errorful data
