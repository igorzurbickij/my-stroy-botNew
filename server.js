const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = '8726678816:AAEMUSahsGhDdw6Vs8lHaGnC-7NW9-i7blY';
const bot = new Telegraf(TOKEN);

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_FILE = path.join(__dirname, 'database.json');

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {};
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Функция получения даты UTC+3 (МСК/Киев)
function getTodayKey() {
    const now = new Date();
    const offset = 3 * 60 * 60 * 1000; 
    return new Date(now.getTime() + offset).toISOString().split('T')[0];
}

const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(__dirname)); 
app.use('/uploads', express.static(UPLOADS_DIR));

// БОТ: Сохранение фото
bot.on('photo', async (ctx) => {
    try {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        const link = await ctx.telegram.getFileLink(fileId);
        const dateKey = getTodayKey(); 
        const fileName = `tg-${Date.now()}.jpg`;
        const filePath = path.join(UPLOADS_DIR, fileName);
        
        const response = await fetch(link);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        let db = readDB();
        if (!db[dateKey]) db[dateKey] = { id: dateKey, text: "", images: [] };
        db[dateKey].images.push(`/uploads/${fileName}`);
        writeDB(db);
        ctx.reply(`✅ Фото сохранено за ${dateKey}`);
    } catch (err) { ctx.reply("Ошибка бота"); }
});
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

// Токен бота
const TOKEN = '8726678816:AAEMUSahsGhDdw6Vs8lHaGnC-7NW9-i7blY';
const bot = new Telegraf(TOKEN);

app.use(express.json());
app.use(express.static(__dirname)); // Раздаем index.html, style.css, js
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_FILE = path.join(__dirname, 'database.json');

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {};
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Загрузка через сайт
const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// API
app.get('/api/all', (req, res) => res.json(readDB()));

app.post('/api/save', upload.array('photos'), (req, res) => {
    const { id, text } = req.body;
    let db = readDB();
    if (!db[id]) db[id] = { id, text: "", images: [] };
    db[id].text = text;
    if (req.files) {
        const newImgs = req.files.map(f => `/uploads/${f.filename}`);
        db[id].images = [...(db[id].images || []), ...newImgs];
    }
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/delete-photo', (req, res) => {
    const { id, photoIndex } = req.body;
    let db = readDB();
    if (db[id] && db[id].images[photoIndex]) {
        // Мы удаляем только ссылку из базы, чтобы не поломать сервер при ошибке доступа к файлу
        db[id].images.splice(photoIndex, 1);
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Photo not found" });
    }
});

// Работа бота
bot.on('photo', async (ctx) => {
    const dateKey = new Date().toISOString().split('T')[0];
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const link = await ctx.telegram.getFileLink(fileId);
    const fileName = `tg-${Date.now()}.jpg`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    const response = await fetch(link);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    let db = readDB();
    if (!db[dateKey]) db[dateKey] = { id: dateKey, text: "", images: [] };
    db[dateKey].images.push(`/uploads/${fileName}`);
    writeDB(db);
    ctx.reply("✅ Фото добавлено в календарь!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
bot.launch();