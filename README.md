
# Run
You can run graphql project trough local port, go live or your browser.

### Audit link
https://github.com/01-edu/public/tree/master/subjects/graphql/audit

### Hosting link

# https://namimorisu.github.io

### Login Page

You'll need a JWT to access the GraphQL API. A JWT can be obtained from the signin endpoint (`https://01.kood.tech/api/auth/signin`).

Your login page must function with both:

- username:password
- email:password

If the credentials are invalid, an appropriate error message must be displayed.

You must provide a method to log out.

When making GraphQL queries, you'll supply the JWT using Bearer authentication. It will only allow access to the data belonging to the authenticated user.

You may inspect the JWT to discover the ID of the authenticated user.







