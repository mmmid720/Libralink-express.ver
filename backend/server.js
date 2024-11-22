const express = require('express');
const path = require('path');
const app = express();

app.listen(8080, () => {
    console.log('http://localhost:8080/ 에서 서버 실행중')
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

// 라우팅
app.get('/', (req, res) => {
    res.render('main');
})
app.get('/signup', (req, res) => {
    res.render('signup', { showTerms: false, showPrivacy: false });
})
app.get('/login', (req, res) => {
    res.render('login', { showPassword: false });
})

app.use(express.static('public'));
