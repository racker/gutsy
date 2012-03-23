
The middleware in this folder obey the express-connect middleware contract.

The pattern is to read from the `req` parameter and then side-effect `req`. The only exception is
`devops_directory_setter`, which wraps the middleware function with a
function that takes the devops directory as an argument.

There are two kinds of middlewares:

- Conventional middleware, in which ordering is important. For example, the following middleware must be  called synchronously in this order:
  - devops_directory_setter
  - load_devops
  - navbar
- API middleware, which make API calls in order to add fields to req.devops. These can be called in parallel as long as req.devops mutations are restricted.
  - The convention is the following:
     If no credentials are provided for making an API call, do nothing
     Else,
       req.devops.<new field name> = { data: null, error: null }
       If there is an error populate error
       Else,
         populate data.
