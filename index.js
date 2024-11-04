import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
import GoogleStrategy from "passport-google-oauth2";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs'); 
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);
//only after initializing Session we can now use passport
app.use(passport.initialize());
app.use(passport.session());

app.get("/", async (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    const data = req.user.secrets;
    res.render("secrets.ejs", { data });
  } else {
    res.redirect("/login");
  }
});

app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
})
);

app.get("/auth/google/secrets", passport.authenticate("google", {
  successRedirect: "/secrets",
  failureRedirect: "/login",
})
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if(err) console.log(err);
    res.redirect("/");
  })
});

// app.post("/login", passport.authenticate("local", {
//     successRedirect: "/secrets",
//     failureRedirect: "/login",
// }));

app.get("/submit", (req, res) => {
  console.log("Got hit by submit a secret btn");
  res.render("submit.ejs");
});
app.post("/submit", async(req, res) => {
  try{
    if(req.isAuthenticated()){
      // res.render("submit.ejs");
      const secretData = req.body.secret;
      const userLogIn = req.user.username;
      console.log("===========");
      console.log(`this user is currently loggedIn ${userLogIn}`);
      console.log("===========");
      // const feed = await db.query("INSERT INTO users (secrets) VALUES($1) WHERE username = $2", [secretData, userLogIn]);
      const feed = await db.query("UPDATE users SET secrets = $1 WHERE username = $2 RETURNING secrets", [secretData, userLogIn]);
      // const data = feed.rows[0].secrets;
      const data = user.secrets;
      //to console the secret that user has entered I need to use RETURNING clause like in code I did
      console.log("This is the feed data ===>", data);
      res.render("secrets.ejs", { data });
    }else{
      console.log("error rendering sumbit file");
      res.redirect("/");
    }
  }catch(err){
    console.log("error inserting secret", err);
  }
  // try{
  //   if(req.isAuthenticated()){
  //     const secretData = req.body.secret;
  //     const meraSec = req.user;
  //     console.log("The person who is logged in",meraSec);
  //     console.log(`secretData is this ===> ${secretData}`);
  //     const feed = await db.query("INSERT INTO users (secrets) VALUES($1) WHERE user = $2", [secretData, meraSec]);
  //     console.log("This is the feed data ===>", feed);
  //     res.render("submit.ejs");
  //   }else{
  //     res.redirect("/login");
  //   }
  // }catch(err){
  //   console.log("error inserting secret", err);
  // }
})

// app.post("/submit", async(req, res) => {
//   try{
//     const secretData = req.body.secret;
//     console.log(`This is my secret data ${secretData}`);
//     const feed = await db.query("INSERT INTO users (secret) VALUES ($1)", [secretData]);
//     console.log(`this data is secret ${feed}`);
//   }catch(err){
//     console.log("error in adding secret", err);
//   }
// });

app.post("/login", (req, res, next) => {
  console.log("Login POST route hit with:", req.body);
  passport.authenticate("local", (err, user, info) => {
    console.log("Authentication response:", { err, user, info });
    if (err) return next(err);
    if (!user){
      // alert("Incorrect password");
      return res.redirect("/login"); //Authentication Failed
    }
    // res.send("incorrect password");
    
    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect("/secrets");
    });
  })(req, res, next);
});
app.post("/register", async (req, res) => {
  const user = req.body.userMail;
  const password = req.body.password;
  //this is data provided by user
  console.log(`This is registered user name ${user}`);
  console.log(`This is the password ${password}`);
  //we need to write logic even for like if user already exist like we cannot have the same users ryt so the logic for that is pretty simple
  const checkUser = await db.query("SELECT * FROM users where userName = $1", [
    user,
  ]);

  if (checkUser.rows.length > 0) {
    res.send("Email alreay exists, Try loging In");
  } else {
    //HASHING PASSWORD
    bcrypt.hash(password, saltRounds, async (err, hash) => {
      //handling error
      if (err) {
        console.log("Error hashing password", err);
      } else {
        //inserting data into database
        const result = await db.query(
          "INSERT INTO users (userName, password) VALUES ($1 , $2) RETURNING *",
          [user, hash]
        );
        const users = result.rows[0];
        req.login(users, (err) => {
          console.log(err);
          res.redirect("/secrets");
        });
        // res.redirect("/");
      }
    });
  }
});

passport.use("local",
    new Strategy({ usernameField: "mail", passwordField: "password" }, async function verify(mail, password, cb) {
//   new Strategy(async function verify(mail, password, cb) {
    // const loginData = req.body.mail;
    // const loginkey = req.body.password;
    // console.log(`This is loginusername ${loginData}`);
    console.log("this is username from verify function:", mail, password);
    //console.log(`This is password ${loginkey}`);
    //db ki logic
    try{
    const userName = await db.query("SELECT * FROM users WHERE username = $1", [
      mail,
    ]);
    if (userName.rows.length === 0) {
      console.log("user is not found in db");
      return cb(null, false, { message: "incorrect mail." });
    }
      const user = userName.rows[0];
      console.log(user);
      const storedHashedPassword = user.password;
      console.log("This is stored hashed password", storedHashedPassword);

      
      const cleanHashedPassword = storedHashedPassword.trim();
      const result = await bcrypt.compare(password, cleanHashedPassword);
      
      console.log("this is result", result);
    //   if (err) {
    //       return cb(err);
    //     } else {
            if (result) {
                return cb(null, user);
            } else {
                return cb(null, false, { message: "Incorrect Password"});
            }
    //   }
    }catch(err){
        console.error("Error in verify function:", err);
        return cb(err);
    }
})
);
//google authnetication
passport.use("google", 
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      console.log(profile);
      try{
        const result  = await db.query("SELECT * FROM users WHERE username = $1", [profile.email]);
        if(result.rows.length === 0){
        const newUser = await db.query("INSERT INTO users (username, password) VALUES ($1, $2)", [profile.email, "google"]);
        cb(null, newUser.rows[0]);
        }else{
          //already existing USer
          cb(null, result.rows[0]);
        }
      }catch(err){
        cb(err);
      }
    }
  )
);

//
passport.serializeUser((user, cb) => {
    cb(null, user.id); // Store user ID
});

passport.deserializeUser(async (id, cb) => {
    const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    cb(null, user.rows[0]);
}); //by gpt (I needed)

app.listen(3000, () => {
    console.log(`server is running on port ${port}`);
});

// if (userName.rows.length > 0) {
//console.log("This is stored username",userName);
//   All of the below code was used before passport (before cookies wala masla)
//   if (result) {
//     res.send("login Successfull");
//   } else {
//     res.send("Incorrect password");
//   }
//    bcrypt.compare(loginkey, storedHashedPassword, (err, result) => {
//     console.log("After comparing",loginkey);
//     if(err){
//         console.log("Error comparing password", err);
//     }else{
//         if(result){
//             res.send("you have logedIn successfully");
//         }else{
//             res.send("Incorrect Password");
//         }
//        }
//    });
// } else {
//   res.send("user Does not exist");
//   return cb("user not found");
// }
//res.redirect("/");
            //testing before comparing
          //   console.log("test data");
          //   console.log("============");
          //   console.log("Plain password (loginkey):", `"${loginkey}"`);
          //   console.log("Retrieved hashed password:", `"${storedHashedPassword}"`);
          //   console.log("Password length:", loginkey.length);
          //   console.log("Hash length:", storedHashedPassword.length);
          //   console.log("============");
      
            // res.redirect("/");
            //I was struggling with this login cause Whenever, I was trying to login I was landing to Incorrect password while even the password was correct.....My code was pretty fine no issues still that was the issue... after not hours but yeah mins of debugging and playing arround with almost everything(I tested my package and many more things then) I got know my issue was with whiteSpaces Alhumdulilah tackled this problem with the help of GPT and the only thing I have to use was trim() method and Done!!❤ Yo
//res.render("done.ejs");

// yo Alhumdulilah after hours (not hours obvio these things are still basic) of breaking my head I got it Alhumdulilah The issue was I was directly passing parameters in my verify function in strategy then I tried like passing paramteres in strategy like userField and passwordField...... then I got it Alhumdulilah💖 happy Coding