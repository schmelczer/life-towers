import psycopg2


def _create_connection():
    return psycopg2.connect(
        user="storebackend", host="localhost", port="5432", database="store"
    )


def execute(query, params):
    with _create_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, params)


def get_first(query, params):
    with _create_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(query, params)
        return cursor.fetchone()
