import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
const saltRounds = 10;

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
   const loginkey = req.body.password;
   //console.log(`This is username ${loginData}`);
   //console.log(`This is password ${loginkey}`);
   //db ki logic
   const userName = await db.query("SELECT * FROM users WHERE username = $1", [loginData]); 
   if(userName.rows.length > 0){
   // console.log("This is stored username",userName);
   const user = userName.rows[0];
   console.log(user);
   const storedHashedPassword = user.password;
   console.log("This is stored hashed password",storedHashedPassword);

//    testing before comparing
console.log("test data");
console.log("============");
console.log("Plain password (loginkey):", `"${loginkey}"`);
console.log("Retrieved hashed password:", `"${storedHashedPassword}"`);
console.log("Password length:", loginkey.length);
console.log("Hash length:", storedHashedPassword.length);
console.log("============");

// res.redirect("/");
//I was struggling with this login cause Whenever, I was trying to login I was landing to Incorrect password while even the password was correct.....My code was pretty fine no issues still that was the issue... after not hours but yeah mins of debugging and playing arround with almost everything(I tested my package and many more things then) I got know my issue was with whiteSpaces Alhumdulilah tackled this problem with the help of GPT and the only thing I have to use was trim() method and Done!!❤ Yo 
  

const cleanedHashedPassword = storedHashedPassword.trim();
const result = await bcrypt.compare(loginkey, cleanedHashedPassword);

//    const result = await bcrypt.compare(loginkey.toString(), storedHashedPassword.toString());
   console.log("this is result",result);
   if(result){
    res.send("login Successfull");
   }else{
    res.send("Incorrect password");
   }
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
   }else{
    res.send("user Does not exist");
   }
   //res.redirect("/");
   //res.render("done.ejs");
});

app.post("/register", async(req, res) => {
    const user = req.body.userMail;
    const password = req.body.password;
    //this is data provided by user
    console.log(`This is registered user name ${user}`);
    console.log(`This is the password ${password}`);
    //we need to write logic even for like if user already exist like we cannot have the same users ryt so the logic for that is pretty simple
    const checkUser = await db.query("SELECT * FROM users where userName = $1", [user]);

    if(checkUser.rows.length > 0){
        res.send("Email alreay exists, Try loging In");
    }else{
    //HASHING PASSWORD
    bcrypt.hash(password, saltRounds, async(err, hash) => {
        //handling error 
        if(err){
            console.log("Error hashing password", err);
        }else{
            //inserting data into database
            const result = await db.query("INSERT INTO users (userName, password) VALUES ($1 , $2)", [user, hash]);
            res.redirect("/");
        }
    });
}
});

app.listen(3000, () => {
    console.log(`server is running on port ${port}`);
});