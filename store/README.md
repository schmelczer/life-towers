# Store backend

## API

- /

  - POST:
    - Register a new user with the provided token.
    - body
      - token: uuid

- /me

  - POST:
    - Log the login of the user.
    - Authorization header
      - \_ token: uuid

- /me/root

  - PUT:

    - Set the root of user data.
    - body
      - root_id: uuid
    - Authorization header
      - \_ token: uuid

  - GET:
    - Get the root of user data.
    - Authorization header
      - \_ token: uuid
    - response
      - uuid

- /me/{id: string}

  - POST:

    - Upload a new object with id.
    - body
      - data: string
    - Authorization header
      - \_ token: uuid

  - GET:
    - Retrieve an object with id.
    - Authorization header
      - \_ token: uuid
    - response
      - string
