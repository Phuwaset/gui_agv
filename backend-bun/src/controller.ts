import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");
const query = db.query("SELECT * FROM books");
// console.log(query.get());

// Disclosure : Get all books from the database
const getBooks = () => {
    try {
        const query = db.query("SELECT * FROM books")
        return query.all() // bun Statement to GET all rows from the query
    } catch (error) {
        console.log('error', error)
        return {}
    }
}

// Disclosure : Get a book by id from the database
const getBook = (id: number) => {
    try {
        const query = db.query("SELECT * FROM books where id=$id;")
        return query.get({
            $id: id
        }) 
    } catch (error) {
        console.log('error', error)
        return {}
    }
}
 
//console.log(getBooks()) // Disclosure : Get all books from the database
// console.log(getBook(1)) // Disclosure : Get a book by id from the database