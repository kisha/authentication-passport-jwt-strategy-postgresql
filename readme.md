## NodeJS/Express/Postgresql/Passport for Mentees

## Step #1 - Basic Setup - WORK IN PROGRESS 


npm init

npm install --save express

npm install --save-dev nodemon

npm install --save passport passport-jwt jsonwebtoken dotenv body-parser

```javascript
//index.js 

const express = require('express');
const app = express();

//... Passport Strategies 

app.get('/', (request, response) => {
  response.send('Hey Brooklyn');
})


app.listen(4000, () => console.log('Server is Running'));
//process.env.PORT || 4000 

```

