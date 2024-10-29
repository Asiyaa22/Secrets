import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    password: "151201",
    database: "world",
    port: 5432,
});
db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async(req, res) => {
    res.render("home.ejs");
});

app.get("/login", (req, res) => {
   res.render("login.ejs");
});

app.get("/register", (req, res) => {
   res.render("register.ejs");
});

app.post("/login", async(req, res) => {
   const loginData = req.body.mail;
   const key = req.body.password;
//    console.log(`This is username ${loginData}`);
//    console.log(`This is password ${key}`);
   //db ki logic
   const userName = await db.query("SELECT * FROM users WHERE username = $1", [loginData]); 
   if(userName.rows.length > 0){
    // console.log("This is stored username",userName);
    const user = userName.rows[0];
    console.log(user);
    const storedPassword = user.password;
    console.log("This is stored password",storedPassword);
    if(key == storedPassword){
        res.send("you have logedIn successfully");
    }else{
        res.send("Incorrect Password");
    }
   }else{
    res.send("user Does not exist");
   }
   //res.redirect("/");
//    res.render("done.ejs");
});

app.post("/register", async(req, res) => {
    const input = req.body.userMail;
    const input2 = req.body.password;
    //this is data provided by user
    console.log(`This is registered user name ${input}`);
    console.log(`This is the password ${input2}`);
    //we need to write logic even for like if user already exist like we cannot have the same users ryt so the logic for that is pretty simple
    const checkUser = await db.query("SELECT * FROM users where userName = $1", [input]);

    if(checkUser.rows.length > 0){
        res.send("Email alreay exists, Try loging In");
    }else{
    //inserting data into database
    const result = await db.query("INSERT INTO users (userName, password) VALUES ($1 , $2)", [input, input2]);
    res.redirect("/");
}
});

app.listen(3000, () => {
    console.log(`server is running on port ${port}`);
});