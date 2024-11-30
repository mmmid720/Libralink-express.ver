const express = require('express');
// const connectDB = require('./config/db');
const app = express();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');


app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.set('view engine', 'ejs');

app.use(cors());
app.use(express.json())
app.use(express.static('public'));

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const MongoStore = require('connect-mongo');


app.use(passport.initialize())
app.use(session({
  secret: '암호화에 쓸 비번', //세션의 document id는  암호화해서 유저에게 보냄
  resave : false, //유저가 서버로 요청할 때마다 세션 갱신 flase로 하는게 일반적임
  saveUninitialized : false, //로그인 안해도 세션 만들것인지
  cookie : {maxAge: 60 * 60 * 1000 }, //1시간 지나면 자동으로 삭제 (로그인 유효기간)
  store: MongoStore.create({
    mongoUrl:'null',
    dbName : 'libra'
  })
}))
app.use(passport.session()) 

//몽고 디비 연결
const { MongoClient } = require('mongodb');
const { connect } = require('http2');
const ObjectId = require('mongodb').ObjectId;

let db
const url = 'null';
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('libra');
  app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
    })
  }).catch((err)=>{
  console.log(err)
})


app.get('/', (req, res) => {
    console.log('Current user:', req.user); // 로그인된 사용자 정보 확인
    res.render('main.ejs', { user: req.user });
})

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  let result = await db.collection('user').findOne({ username : 입력한아이디})
  console.log(result)
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없습니다.' })//db에 회원정보가 없을때
  }

  if (await bcrypt.compare(입력한비번, result.password)) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번이 일치하지 않습니다.' })
  }
}))


passport.serializeUser((user, done) => {
  console.log(user)
  process.nextTick(() => { // 특정 코드를 비동기로 처리해주는것
    done(null, { id: user._id, username : user.username })
  })
})

passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({_id : new ObjectId(user.id) })
  delete result.password
  process.nextTick(() => {
    return done(null, result)
  })
})

app.get('/login', async (req, res)=>{
  // console.log(res.user);
  res.render('login.ejs')
})

app.post('/login', async (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.render('login.ejs', { error: '회원 정보가 일치하지 않습니다.' });
    }
    passport.authenticate('local', (error, user, info) => {
      if (error) return res.status(500).json(error);
      if (!user) {
        // 에러 메시지와 함께 login 페이지로 리다이렉트
        return res.render('login.ejs', { error: info.message });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.redirect('/');
      });
    })(req, res, next);
  });

app.get('/signup', async(req, res)=>{
  res.render('signup.ejs')
})

app.post('/signup', async (req, res)=>{

  let hash = await bcrypt.hash(req.body.password, 10) //hash 
// console.log(hash)
  await db.collection('user').insertOne({
    username: req.body.username,
    password: hash,
    name: req.body.name,
    useremail: req.body.useremail
  })
  res.redirect('/');
})

app.get('/libraryinfo', async (req, res) => {
    res.render('libraryinfo', {
        currentUrl: req.url,
        user: req.user
    });
})

app.post('/logout', (req, res) => {
req.logout((err) => {
    if (err) {
    return next(err);
    }
    res.redirect('/');
});
});

//api - 검색
const axios = require('axios');

const CLIENT_ID = 'null';
const CLIENT_SECRET = 'null';

app.post('/search', async(req, res)=>{
  const query = req.body.search;
  console.log(query);

  if(!query || query.trim() === ''){
    return res.status(400).json({error: '검색어를 입력하세요.'});
  }

  const url ='https://openapi.naver.com/v1/search/book.json';
  console.log(url)
  try {
    const response = await axios.get(url, {
      params: {query, display: 10, start: 1 },
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
      },
    });
    // 검색 결과를 EJS 템플릿으로 전달
  res.render('result.ejs', { books: response.data.items, query, user: req.user });
  } catch (error) {
    console.error('API 요청 오류:', error.message);
    res.status(500).json({ error: 'API 요청 중 오류가 발생했습니다.' });
  }
});