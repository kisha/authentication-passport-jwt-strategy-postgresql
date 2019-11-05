# Authentication - Using JWT, Passport & Postgresql (for Techtonica Mentees) - *Draft*

## LUNCH & LEARN NOTES 

##### NOTE:  *This is an educational example.* 

This is NOT intended to be a "copy & paste" solution. This is a directional example displaying the steps required to get the jwt strategy working with passport & postgresql. 

## Step #1 - Basic Setup

npm init

npm install --save express

npm install --save-dev nodemon

npm install --save passport passport-jwt jsonwebtoken dotenv body-parser

```javascript
//index.js 

const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

//... Passport Strategies (TBD)

// Endpoints 

app.get('/', (request, response) => {
  response.send('Hey Brooklyn');
})


//process.env.PORT || 4000 
const portSettings = process.env.PORT || 4000
app.listen(portSettings, () => console.log('Server is Running'));

```


## Step #1a - scripts, .gitignore & .env updates 

- Add `"dev": "nodemon index.js"` to the scripts section of your `package.json` This will give you the ability to start the server using nodemon using `npm run dev` 
- Add an .env file with ...
  - SECRET_KEY=whateveritIs
- Add a .gitignore file
  - Add `node_modules` && `.env` to it ...

## Step #1b - Passport Strategies Setup 

```javascript 
//Passport && Strategies
const passport = require('passport');
const passportJWT = require('passport-jwt');
const JwtStrategy = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET_KEY
}

const strategyForJwt = new JwtStrategy(options, (payload, next) => {
 //Covered & Included in section #7
})

//use passport && body parser
passport.use(strategyForJwt);
app.use(passport.initialize());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());


```



## Step #2 - Setup encryption & ORM connectivity

`npm install --save bcrypt knex bookshelf bookshelf-secure-password pg`

`npm install -g knex`

`knex init` will creates `knexfile.js` 



```javascript
// knexfile.js file
// Remove everything BUT the development bit for now ...

module.exports = {

  development: {
    client: 'pg',
    connection: 'postgres://localhost/jwt_pg_auth_tutorial'
  }
};

// NOTE: The intention of this tutorial is to walk you through how to get authentication running in your *development* environment. 
// production & staging settings will also live here
```

## STEP #3 - Create Database using psql @ the command line

##### ASSUMPTION NOTE:  *You have postgresql running locally* 

`psql` 

`CREATE DATABASE jwt_pg_auth_tutorial;` 

## STEP #4 - Create a Migration with Knex for the User Authentication table  @command line

Note: We will use [knex.js](https://knexjs.org/), as SQL query builder.

Run the following at the command line ...

- `knex migrate:make create_user_authentication_table` 

The above, creates a `/migrations` folder with ONE file ...

Add the following information to the ONE migration file ...

```javascript
// ..migrations/...create_user_authentication_table.js 

exports.up = function(knex) {
  return knex.schema.createTable('user_authentication', t => {
    t.increments('id').unsigned().primary();
    t.string('email').notNull();
    t.string('password_digest').notNull();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_authentication');
};

```

Run the migration ...

```
//command line input
mavryck:node-auth-jwt-postgresql kisha$ knex migrate:latest 

//command line response (if successful)
Using environment: development
Batch 1 run: 1 migrations

```


## STEP #5 - Check Postgresql for Successful Table Migration

```sql
mavryck:node-auth-jwt-postgresql kisha$ psql
psql (11.5)
Type "help" for help.

kisha=# \c jwt_pg_auth_tutorial
You are now connected to database "jwt_pg_auth_tutorial" as user "kisha".
jwt_pg_auth_tutorial=# \dt
               List of relations
 Schema |         Name         | Type  | Owner 
--------+----------------------+-------+-------
 public | knex_migrations      | table | kisha
 public | knex_migrations_lock | table | kisha
 public | user_authentication  | table | kisha
(3 rows)

jwt_pg_auth_tutorial=# 
```

## STEP #6 - Connect to Database & ORM & setup model 

```javascript 
//index.js 

//Database & ORM Connectivity with knex && bookshelf
const knex = require('knex');
const knexDatabase = knex(
    {
      client: 'pg',
      connection: 'postgres://localhost/jwt_pg_auth_tutorial'
    }
  );

const bcrypt = require('bcrypt') //hashed password library
const bookShelf = require('bookshelf');
const bookShelfDatabase = bookShelf(knexDatabase);
const securePassword = require('bookshelf-secure-password');
bookShelfDatabase.plugin(securePassword);

  //create a user model with secure password
const User = bookShelfDatabase.Model.extend({
  tableName: 'user_authentication',
  hasSecurePassword: true //password_digest using bcrypt
});


```

## Step #7 - Create &  .strategyForJwt function to interact with the Database using Knex/Bookshelf

```javascript
const strategyForJwt = new JwtStrategy(options, (payload, next) => {
  const user = User.forge({ id: payload.id }).fetch().then(result => {
    next(null, result);
  });
})
```

## Step #8 - Create Some Basic Endpoints

```javascript
//Register User
app.post('/register', async (request, response) => {
  if(!request.body.email || !request.body.password) {
    return response.statusMessage(401).send('email & password are required');
  }
  const hashedPassword = await bcrypt.hash(request.body.password, 12) //bcrypt encryption 

  const user = new User({
    email: request.body.email, 
    password_digest: hashedPassword
  });

  user.save().then( () => 
  { 
    response.send('All good in the neighborhood. User has been successfully created');
  });

});

// Authenticate && Return a Token if Valid User/Password 
app.post('/getToken', (request, response) => {
  if(!request.body.email || !request.body.password) {
    return response.status(401).send('Wrong email or password used.');
  }

  User.forge( { email: request.body.email } ).fetch().then( result => {
    if(!result) {
      return response.status(400).send('email not found');
    }
    result.authenticate(request.body.password).then(user => {
      const payload = { id: user.id };
      const token = jwt.sign(payload, process.env.SECRET_KEY);
      response.send(token);
    }).catch(error => {
      return response.status(401).send({ error: error} );
    })
  });
});

// Use Token to Access A protected page 
app.get('/tokenProtected', passport.authenticate(
  'jwt', { session: false } ),
  (request, response) => {
    response.send('Endpoint requires token');
});

```


## Step #9 - Try out Endpoints 

**Test EACH endpoint. Evaluate YOUR understanding BEFORE integrating logic into ANY of your projects**

**1 - POST to  the `/register`  endpoint** 

POST to  `/register` using Insomina/Postman with email & password 

![register-endpoint](/register-endpoint.png?true "Register Endpoint")

Confirm that User data persisted in Postgresql via `psql` with a Hashed Password using bcrypt @commandline
![register-endpoint](/user-authentication-data.png?true "PSQL query")


**2 - /getToken** 

- POST to  `/getToken`** with the email & password to request a token

![getToken](/getToken.png?true "getToke Endpont")

**3 - GET /tokenProtected with Authorization/Bearer Token details in the header**

  - ![protected-page](/protected-page.png?true "Token Protection")
