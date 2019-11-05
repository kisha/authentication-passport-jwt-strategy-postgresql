const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

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
  const user = User.forge({ id: payload.id }).fetch().then(result => {
    next(null, result);
  });
})

//use passport && body parser
passport.use(strategyForJwt);
app.use(passport.initialize());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());


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


//Endpoints 
app.get('/', (request, response) => {
  response.send('Hey Brooklyn');
})

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

//process.env.PORT || 4000 
const portSettings = process.env.PORT || 4000
app.listen(portSettings, () => console.log('Server is Running'));